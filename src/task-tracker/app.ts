import {
    compareTimestamps,
    createSnapshot,
    createTask,
    daysSince,
    daysUntil,
    normalizeSnapshot,
} from './model';
import { loadLocalSnapshot, saveLocalSnapshot } from './storage';
import { injectTaskTrackerStyles } from './styles';
import { TASK_TRACKER_TEMPLATE } from './template';
import type { TaskStage, TaskTrackerSnapshot, TrackedTask } from './types';
import { WikiConfigClient } from './wikiConfig';

const wikiClient = new WikiConfigClient();

export function createTaskTrackerApp(): object {
    return {
        name: 'NoticeboardTaskTracker',
        template: TASK_TRACKER_TEMPLATE,
        compatConfig: {
            MODE: 3,
        },
        compilerOptions: {
            whitespace: 'condense',
        },
        data() {
            return {
                open: false,
                tasks: [] as TrackedTask[],
                updatedAt: '',
                statusMessage: '尚未載入',
                isHydrating: false,
                isLoading: false,
                isSaving: false,
                hasLoaded: false,
                editingTaskId: '',
                stageOptions: [
                    { value: 'proposal' as TaskStage, label: '提案' },
                    { value: 'publicNotice' as TaskStage, label: '公示' },
                    { value: 'closed' as TaskStage, label: '結束' },
                ],
            };
        },
        computed: {
            canSaveToWiki(): boolean {
                return wikiClient.canSave();
            },
            configPageLabel(): string {
                return wikiClient.title || '';
            },
            primaryAction(): Record<string, unknown> {
                return {
                    label: this.isSaving ? '儲存中...' : '儲存',
                    actionType: 'progressive',
                    disabled: this.isSaving || !this.canSaveToWiki,
                };
            },
            defaultAction(): Record<string, unknown> {
                return {
                    label: '關閉',
                };
            },
        },
        watch: {
            tasks: {
                handler(): void {
                    this.persistLocalChange();
                },
                deep: true,
            },
        },
        mounted(): void {
            injectTaskTrackerStyles();
            void this.loadInitialData();
        },
        methods: {
            openDialog(): void {
                this.open = true;
                if (!this.hasLoaded && !this.isLoading) {
                    void this.loadInitialData();
                }
            },
            async loadInitialData(): Promise<void> {
                this.isLoading = true;
                const localSnapshot = loadLocalSnapshot();

                if (localSnapshot) {
                    await this.applySnapshot(localSnapshot);
                    this.statusMessage = '已載入暫存資料';
                }

                if (!wikiClient.canSave()) {
                    this.hasLoaded = true;
                    this.isLoading = false;
                    this.statusMessage = '未登入，無法儲存';
                    return;
                }

                try {
                    const remote = await wikiClient.load();
                    const remoteSnapshot = remote ? normalizeRemoteSnapshot(remote.config.taskTracker) : null;
                    const chosen = chooseNewerSnapshot(localSnapshot, remoteSnapshot);

                    if (chosen?.snapshot) {
                        await this.applySnapshot(chosen.snapshot);
                        saveLocalSnapshot(chosen.snapshot);
                        this.statusMessage = chosen.source === 'remote'
                            ? '已載入wiki資料'
                            : '有尚未儲存的變更';
                    } else if (!localSnapshot) {
                        await this.applySnapshot(createSnapshot([]));
                        saveLocalSnapshot(this.currentSnapshot());
                        this.statusMessage = '已建立空白追蹤清單';
                    }

                    this.hasLoaded = true;
                } catch (error) {
                    this.statusMessage = `載入wiki資料失敗：${errorMessage(error)}`;
                } finally {
                    this.isLoading = false;
                }
            },
            addTask(): void {
                const task = createTask();
                this.tasks.push(task);
                this.editingTaskId = task.id;
            },
            removeTask(id: string): void {
                this.tasks = this.tasks.filter((task: TrackedTask) => task.id !== id);
                if (this.editingTaskId === id) {
                    this.editingTaskId = '';
                }
            },
            async saveToWiki(): Promise<void> {
                if (!wikiClient.canSave()) {
                    this.statusMessage = '未登入，無法儲存';
                    return;
                }

                if (this.isSaving) {
                    return;
                }

                this.isSaving = true;
                const snapshot = this.currentSnapshot();

                try {
                    const result = await wikiClient.save(snapshot);
                    if (result.ok === false) {
                        await this.applySnapshot(result.remoteSnapshot);
                        saveLocalSnapshot(result.remoteSnapshot);
                        this.statusMessage = 'wiki資料較新，已載入wiki版本；未覆蓋';
                        return;
                    }

                    saveLocalSnapshot(snapshot);
                    this.statusMessage = '已儲存';
                } catch (error) {
                    if (await this.handleSaveRace(snapshot, error)) {
                        return;
                    }

                    this.statusMessage = `儲存失敗：${errorMessage(error)}`;
                } finally {
                    this.isSaving = false;
                }
            },
            persistLocalChange(): void {
                if (this.isHydrating) {
                    return;
                }

                this.updatedAt = new Date().toISOString();
                const ok = saveLocalSnapshot(this.currentSnapshot());
                this.statusMessage = ok ? '有尚未儲存的變更' : '暫存失敗，請儘快儲存';
            },
            async applySnapshot(snapshot: TaskTrackerSnapshot): Promise<void> {
                this.isHydrating = true;
                this.updatedAt = snapshot.updatedAt;
                this.tasks = snapshot.tasks.map((task) => ({ ...task }));
                await this.$nextTick();
                this.isHydrating = false;
            },
            currentSnapshot(): TaskTrackerSnapshot {
                return createSnapshot(this.tasks, this.updatedAt || new Date().toISOString());
            },
            proposalAgeLabel(task: TrackedTask): string {
                const days = daysSince(task.createdAt);
                if (days === null) {
                    return '發起日期未設定';
                }

                return days === 0 ? '今日發起' : `已發起 ${days} 日`;
            },
            publicNoticeLabel(task: TrackedTask): string {
                if (!task.isPublicNotice && !task.publicNoticeEnd) {
                    return '';
                }

                const days = daysUntil(task.publicNoticeEnd);
                if (days === null) {
                    return '公示期限未設定';
                }

                if (days < 0) {
                    return `公示已逾期 ${Math.abs(days)} 日`;
                }

                if (days === 0) {
                    return '公示今日到期';
                }

                return `公示尚餘 ${days} 日`;
            },
            isPublicNoticeOverdue(task: TrackedTask): boolean {
                const days = daysUntil(task.publicNoticeEnd);
                return days !== null && days <= 0;
            },
            stageLabel(stage: TaskStage): string {
                return this.stageOptions.find((option: { value: TaskStage }) => option.value === stage)?.label || '提案';
            },
            isEditing(task: TrackedTask): boolean {
                return this.editingTaskId === task.id;
            },
            openTaskEditor(id: string): void {
                this.editingTaskId = id;
            },
            closeTaskEditor(): void {
                this.editingTaskId = '';
            },
            handleDialogContentClick(event: MouseEvent): void {
                if (!this.editingTaskId) {
                    return;
                }

                const target = event.target as Element | null;
                if (!target?.closest?.(`[data-task-id="${this.editingTaskId}"]`)) {
                    this.closeTaskEditor();
                }
            },
            async handleSaveRace(snapshot: TaskTrackerSnapshot, error: unknown): Promise<boolean> {
                if (!isRaceError(error)) {
                    return false;
                }

                try {
                    const remote = await wikiClient.load();
                    const remoteSnapshot = remote ? normalizeSnapshot(remote.config.taskTracker) : null;

                    if (remoteSnapshot && compareTimestamps(remoteSnapshot.updatedAt, snapshot.updatedAt) > 0) {
                        await this.applySnapshot(remoteSnapshot);
                        saveLocalSnapshot(remoteSnapshot);
                        this.statusMessage = '儲存時偵測到wiki資料較新，已載入wiki版本；未覆蓋';
                    } else {
                        this.statusMessage = '儲存時遇到編輯衝突；目前資料較新，請再按儲存重試';
                    }

                    return true;
                } catch (loadError) {
                    this.statusMessage = `儲存遇到衝突，且重新載入失敗：${errorMessage(loadError)}`;
                    return true;
                }
            },
        },
    };
}

function normalizeRemoteSnapshot(value: unknown): TaskTrackerSnapshot | null {
    return normalizeSnapshot(value);
}

function chooseNewerSnapshot(
    localSnapshot: TaskTrackerSnapshot | null,
    remoteSnapshot: TaskTrackerSnapshot | null,
): { source: 'local' | 'remote'; snapshot: TaskTrackerSnapshot } | null {
    if (localSnapshot && remoteSnapshot) {
        return compareTimestamps(remoteSnapshot.updatedAt, localSnapshot.updatedAt) > 0
            ? { source: 'remote', snapshot: remoteSnapshot }
            : { source: 'local', snapshot: localSnapshot };
    }

    if (remoteSnapshot) {
        return { source: 'remote', snapshot: remoteSnapshot };
    }

    if (localSnapshot) {
        return { source: 'local', snapshot: localSnapshot };
    }

    return null;
}

function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function isRaceError(error: unknown): boolean {
    const message = errorMessage(error);
    return /editconflict|articleexists|edit conflict/i.test(message);
}

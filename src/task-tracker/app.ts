import {
    compareTimestamps,
    createSnapshot,
    createTask,
    hasPublicNoticeEnded,
    normalizeSnapshot,
} from './model';
import { loadLocalSnapshot, saveLocalSnapshot } from './storage';
import { injectTaskTrackerStyles } from './styles';
import { TASK_TRACKER_TEMPLATE } from './template';
import type { TaskSeed, TaskStage, TaskTrackerSnapshot, TrackedTask } from './types';
import { WikiConfigClient } from './wikiConfig';
import { errorMessage, fetchCurrentWikitext } from '../mediawiki';
import {
    daysSinceUtcDate,
    daysUntilUtcDate,
    utcDateValue,
} from '../datetime';
import {
    isSpeedyDeleteTalkTask,
    targetFromTaskPageTitle,
    type TaskTarget,
} from './taskTargets';
import { wikiPageUrl } from '../wikiTitle';
import {
    bulletinMismatchLabel as bulletinMismatchLabelForTask,
    rfcMismatchLabel as rfcMismatchLabelForTask,
    speedyDeleteDataWarning as speedyDeleteDataWarningForTask,
    taskWarnings as taskWarningsForTask,
    type TaskWarning,
} from './warnings';
import {
    openMakePublicRfcEditor as openMakePublicRfcEditorAction,
    openPublicNoticeMessageEditor as openPublicNoticeMessageEditorAction,
    openPublicNoticePassedMessageEditor as openPublicNoticePassedMessageEditorAction,
    openPublicNoticeTemplateRemovalEditor as openPublicNoticeTemplateRemovalEditorAction,
} from './publicNoticeActions';
import {
    openDeleteDataEditRequestEditor as openDeleteDataEditRequestEditorAction,
    openDeleteDataSandboxEditor as openDeleteDataSandboxEditorAction,
} from './deleteDataActions';
import { isSectionOnRfc } from '../rfc-editor/api';
import { openRfcEditorForSection } from '../rfc-editor/open';
import { fetchBulletinLinkedPageTitles, normalizeBulletinPageTitle } from './bulletinStatus';
import { refreshEditsectionTrackingLinkLabels } from './editsectionLinks';
import { currentPageTitle, findCurrentPageSection } from './pageSections';
import {
    containsComparisonTemplateContent,
    extractComparisonTemplateContent,
} from './publicNoticeWikitext';
import { vueCompatOptions } from '../codex';

const wikiClient = new WikiConfigClient();
const stageSortOrder: Record<TaskStage, number> = {
    proposal: 0,
    publicNotice: 1,
    closed: 2,
};

export function createTaskTrackerApp(): object {
    return {
        name: 'NoticeboardTaskTracker',
        template: TASK_TRACKER_TEMPLATE,
        ...vueCompatOptions(),
        data() {
            return {
                open: false,
                tasks: [] as TrackedTask[],
                updatedAt: '',
                statusMessage: wgULS('尚未载入', '尚未載入'),
                isHydrating: false,
                isLoading: false,
                isSaving: false,
                hasLoaded: false,
                loadPromise: null as Promise<void> | null,
                editingTaskId: '',
                rfcStatusByPageTitle: {} as Record<string, boolean | undefined>,
                rfcStatusPromisesByPageTitle: {} as Record<string, Promise<void> | undefined>,
                bulletinLinkedPageTitles: null as string[] | null,
                bulletinStatusByPageTitle: {} as Record<string, boolean | undefined>,
                bulletinStatusRefreshPromise: null as Promise<void> | null,
                comparisonTemplateStatusByPageTitle: {} as Record<string, boolean | undefined>,
                comparisonTemplateStatusPromisesByPageTitle: {} as Record<string, Promise<void> | undefined>,
                stageOptions: [
                    { value: 'proposal' as TaskStage, label: '提案' },
                    { value: 'publicNotice' as TaskStage, label: '公示' },
                    { value: 'closed' as TaskStage, label: wgULS('结束', '結束') },
                ],
            };
        },
        computed: {
            sortedTasks(): TrackedTask[] {
                return this.tasks
                    .map((task: TrackedTask, index: number) => ({ task, index }))
                    .sort(compareDisplayTasks)
                    .map(({ task }: { task: TrackedTask }) => task);
            },
            canSaveToWiki(): boolean {
                return wikiClient.canSave();
            },
            configPageLabel(): string {
                return wikiClient.title || '';
            },
            primaryAction(): Record<string, unknown> {
                return {
                    label: this.isSaving ? wgULS('保存中...', '儲存中...') : wgULS('保存', '儲存'),
                    actionType: 'progressive',
                    disabled: this.isSaving || !this.canSaveToWiki,
                };
            },
            defaultAction(): Record<string, unknown> {
                return {
                    label: wgULS('关闭', '關閉'),
                };
            },
        },
        watch: {
            tasks: {
                handler(): void {
                    this.persistLocalChange();
                    refreshEditsectionTrackingLinkLabels(this.tasks);
                    this.refreshCurrentPageRfcStatuses();
                    this.refreshBulletinStatusesFromCache();
                    this.refreshComparisonTemplateStatuses();
                },
                deep: true,
            },
        },
        mounted(): void {
            injectTaskTrackerStyles();
            void this.ensureLoaded();
        },
        methods: {
            openDialog(): void {
                this.open = true;
                void this.ensureLoaded().then(() => {
                    void this.refreshBulletinStatusesForDialogOpen();
                    this.refreshComparisonTemplateStatuses(true);
                });
            },
            async addOrOpenTask(seed: TaskSeed): Promise<void> {
                this.open = true;
                await this.ensureLoaded();
                const existingTask = findExistingTask(this.tasks, seed);
                if (existingTask) {
                    if (typeof seed.hasRfc === 'boolean') {
                        this.rfcStatusByPageTitle[existingTask.pageTitle] = seed.hasRfc;
                    }
                    this.editingTaskId = existingTask.id;
                    this.refreshCurrentPageRfcStatuses();
                    void this.refreshBulletinStatusesForDialogOpen();
                    return;
                }

                const task = createTask(seed);
                this.tasks.push(task);
                this.editingTaskId = task.id;
                this.refreshCurrentPageRfcStatuses();
                void this.refreshBulletinStatusesForDialogOpen();
            },
            ensureLoaded(): Promise<void> {
                if (this.hasLoaded) {
                    return Promise.resolve();
                }

                if (!this.loadPromise) {
                    this.loadPromise = this.loadInitialData().finally(() => {
                        this.loadPromise = null;
                    });
                }

                return this.loadPromise;
            },
            async loadInitialData(): Promise<void> {
                this.isLoading = true;
                const localSnapshot = loadLocalSnapshot();

                if (localSnapshot) {
                    await this.applySnapshot(localSnapshot);
                    this.statusMessage = wgULS('已载入暂存资料', '已載入暫存資料');
                }

                if (!wikiClient.canSave()) {
                    this.hasLoaded = true;
                    this.isLoading = false;
                    this.statusMessage = wgULS('未登录，无法保存', '未登入，無法儲存');
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
                            ? wgULS('已载入wiki资料', '已載入wiki資料')
                            : wgULS('有尚未保存的更改', '有尚未儲存的變更');
                    } else if (!localSnapshot) {
                        await this.applySnapshot(createSnapshot([]));
                        saveLocalSnapshot(this.currentSnapshot());
                        this.statusMessage = wgULS('已建立空白追踪清单', '已建立空白追蹤清單');
                    }

                    this.hasLoaded = true;
                } catch (error) {
                    console.error('Failed to load task tracker wiki data:', error);
                    this.statusMessage = wgULS('载入wiki资料失败：', '載入wiki資料失敗：') + errorMessage(error);
                } finally {
                    this.isLoading = false;
                }
            },
            addTask(): void {
                const task = createTask();
                this.tasks.push(task);
                this.editingTaskId = task.id;
                this.refreshCurrentPageRfcStatuses();
            },
            openBulletinPage(): void {
                const opened = window.open(wikiPageUrl('Template:Bulletin'), '_blank', 'noopener,noreferrer');
                if (opened) {
                    opened.opener = null;
                }
            },
            openTaskPage(task: TrackedTask): void {
                if (!task.pageTitle) {
                    return;
                }

                const url = wikiPageUrl(task.pageTitle);
                const opened = window.open(url, '_blank', 'noopener,noreferrer');
                if (opened) {
                    opened.opener = null;
                }
            },
            removeTask(id: string): void {
                this.tasks = this.tasks.filter((task: TrackedTask) => task.id !== id);
                if (this.editingTaskId === id) {
                    this.editingTaskId = '';
                }
                this.refreshCurrentPageRfcStatuses();
            },
            async saveToWiki(): Promise<void> {
                if (!wikiClient.canSave()) {
                    this.statusMessage = wgULS('未登录，无法保存', '未登入，無法儲存');
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
                        this.statusMessage = wgULS('wiki资料较新，已载入wiki版本；未覆盖', 'wiki資料較新，已載入wiki版本；未覆蓋');
                        return;
                    }

                    saveLocalSnapshot(snapshot);
                    this.statusMessage = wgULS('已保存', '已儲存');
                } catch (error) {
                    if (await this.handleSaveRace(snapshot, error)) {
                        return;
                    }

                    console.error('Failed to save task tracker wiki data:', error);
                    this.statusMessage = wgULS('保存失败：', '儲存失敗：') + errorMessage(error);
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
                this.statusMessage = ok
                    ? wgULS('有尚未保存的更改', '有尚未儲存的變更')
                    : wgULS('暂存失败，请尽快保存', '暫存失敗，請儘快儲存');
            },
            async applySnapshot(snapshot: TaskTrackerSnapshot): Promise<void> {
                this.isHydrating = true;
                this.updatedAt = snapshot.updatedAt;
                this.tasks = snapshot.tasks.map((task) => ({ ...task }));
                await this.$nextTick();
                this.isHydrating = false;
                refreshEditsectionTrackingLinkLabels(this.tasks);
                this.refreshCurrentPageRfcStatuses();
                this.refreshComparisonTemplateStatuses();
            },
            currentSnapshot(): TaskTrackerSnapshot {
                return createSnapshot(this.tasks, this.updatedAt || new Date().toISOString());
            },
            proposalAgeLabel(task: TrackedTask): string {
                const days = daysSinceUtcDate(task.createdAt);
                if (days === null) {
                    return wgULS('发起日期未设置', '發起日期未設定');
                }

                return days === 0 ? wgULS('今日发起', '今日發起') : wgULS(`已发起 ${days} 日`, `已發起 ${days} 日`);
            },
            publicNoticeLabel(task: TrackedTask): string {
                if (!task.isPublicNotice && !task.publicNoticeEnd) {
                    return '';
                }

                const days = daysUntilUtcDate(task.publicNoticeEnd);
                if (days === null) {
                    return wgULS('公示期限未设置', '公示期限未設定');
                }

                if (days < 0) {
                    return wgULS(`公示已逾期 ${Math.abs(days)} 日`, `公示已逾期 ${Math.abs(days)} 日`);
                }

                if (days === 0) {
                    return '公示今日到期';
                }

                return wgULS(`公示尚余 ${days} 日`, `公示尚餘 ${days} 日`);
            },
            isPublicNoticeOverdue(task: TrackedTask): boolean {
                return task.isPublicNotice && hasPublicNoticeEnded(task);
            },
            canSendPublicNoticePassedMessage(task: TrackedTask): boolean {
                return task.isPublicNotice
                    && hasPublicNoticeEnded(task)
                    && targetFromTaskPageTitle(task.pageTitle) !== null;
            },
            canDehydrateComparisonTemplate(task: TrackedTask): boolean {
                return this.comparisonTemplateStatusByPageTitle[task.pageTitle] === true;
            },
            canOpenDeleteDataSandboxEditor(task: TrackedTask): boolean {
                return task.stage !== 'closed' && isSpeedyDeleteTalkTask(task);
            },
            canSendDeleteDataEditRequest(task: TrackedTask): boolean {
                return this.canOpenDeleteDataSandboxEditor(task);
            },
            stageLabel(stage: TaskStage): string {
                return this.stageOptions.find((option: { value: TaskStage }) => option.value === stage)?.label || '提案';
            },
            rfcMismatchLabel(task: TrackedTask): string {
                return rfcMismatchLabelForTask(task, this.rfcStatusByPageTitle[task.pageTitle]);
            },
            speedyDeleteDataWarning(task: TrackedTask): TaskWarning | null {
                return speedyDeleteDataWarningForTask(task);
            },
            taskWarnings(task: TrackedTask): TaskWarning[] {
                return taskWarningsForTask(task, {
                    bulletinDetected: this.bulletinStatusByPageTitle[task.pageTitle],
                    rfcDetected: this.rfcStatusByPageTitle[task.pageTitle],
                });
            },
            canOpenRfcEditor(task: TrackedTask): boolean {
                return findCurrentPageSection(task.pageTitle) !== null;
            },
            bulletinMismatchLabel(task: TrackedTask): string {
                return bulletinMismatchLabelForTask(task, this.bulletinStatusByPageTitle[task.pageTitle]);
            },
            async refreshBulletinStatusesForDialogOpen(): Promise<void> {
                if (this.bulletinStatusRefreshPromise) {
                    return this.bulletinStatusRefreshPromise;
                }

                this.bulletinLinkedPageTitles = null;
                this.bulletinStatusByPageTitle = {};

                const promise = (async () => {
                    try {
                        this.bulletinLinkedPageTitles = Array.from(await fetchBulletinLinkedPageTitles());
                        this.refreshBulletinStatusesFromCache();
                    } catch (error) {
                        console.warn('Failed to detect Template:Bulletin status for tracked tasks:', error);
                    } finally {
                        this.bulletinStatusRefreshPromise = null;
                    }
                })();

                this.bulletinStatusRefreshPromise = promise;
                return promise;
            },
            refreshBulletinStatusesFromCache(): void {
                if (!this.bulletinLinkedPageTitles) {
                    return;
                }

                const linkedPageTitles = new Set(this.bulletinLinkedPageTitles);
                const nextStatus: Record<string, boolean | undefined> = {};
                for (const task of this.tasks) {
                    if (task.pageTitle) {
                        nextStatus[task.pageTitle] = linkedPageTitles.has(normalizeBulletinPageTitle(task.pageTitle));
                    }
                }

                this.bulletinStatusByPageTitle = nextStatus;
            },
            async openRfcEditorForTask(task: TrackedTask): Promise<void> {
                const section = findCurrentPageSection(task.pageTitle);
                if (section === null) {
                    this.statusMessage = wgULS('找不到对应章节，无法开启RfC编辑器', '找不到對應章節，無法開啟RfC編輯器');
                    return;
                }

                try {
                    await openRfcEditorForSection(currentPageTitle(), section);
                } catch (error) {
                    console.error('Failed to open RfC editor from task tracker:', error);
                    this.statusMessage = wgULS('无法开启RfC编辑器：', '無法開啟RfC編輯器：') + errorMessage(error);
                    mw.notify(this.statusMessage, { type: 'error' });
                }
            },
            openPublicNoticeMessageEditor(task: TrackedTask): void {
                const target = this.taskTargetOrNotify(task);
                if (!target) {
                    return;
                }

                openPublicNoticeMessageEditorAction(
                    task,
                    target,
                    (nextTarget, days, endTimestamp) => this.openMakePublicRfcEditor(nextTarget, days, endTimestamp),
                );
            },
            openPublicNoticePassedMessageEditor(task: TrackedTask): void {
                const target = this.taskTargetOrNotify(task);
                if (!target) {
                    return;
                }

                openPublicNoticePassedMessageEditorAction(
                    task,
                    target,
                    (nextTarget, wikitext) => this.openPublicNoticeTemplateRemovalEditor(nextTarget, wikitext),
                );
            },
            openPublicNoticeTemplateRemovalEditor(
                target: TaskTarget,
                wikitext: string,
            ): void {
                openPublicNoticeTemplateRemovalEditorAction(target, wikitext);
            },
            openMakePublicRfcEditor(
                target: TaskTarget,
                days: number,
                endTimestamp: string,
            ): void {
                openMakePublicRfcEditorAction(target, days, endTimestamp);
            },
            async dehydrateComparisonTemplate(task: TrackedTask): Promise<void> {
                const target = this.taskTargetOrNotify(task);
                if (!target) {
                    return;
                }

                try {
                    const sectionWikitext = await fetchCurrentWikitext(target.pageTitle, target.section);
                    const content = extractComparisonTemplateContent(sectionWikitext);
                    if (content === null) {
                        this.comparisonTemplateStatusByPageTitle[task.pageTitle] = false;
                        this.statusMessage = wgULS('找不到可脱水的比较条文', '找不到可脫水的比較條文');
                        mw.notify(this.statusMessage, { type: 'warn' });
                        return;
                    }

                    task.notes = appendComparisonNotes(task.notes, content);
                    this.statusMessage = wgULS('已将比较条文内容加入备注', '已將比較條文內容加入備註');
                } catch (error) {
                    console.error('Failed to dehydrate comparison template:', error);
                    this.statusMessage = wgULS('脱水比较条文失败：', '脫水比較條文失敗：') + errorMessage(error);
                    mw.notify(this.statusMessage, { type: 'error' });
                }
            },
            async openDeleteDataSandboxEditor(): Promise<void> {
                await openDeleteDataSandboxEditorAction((message) => {
                    this.statusMessage = message;
                });
            },
            async openDeleteDataEditRequestEditor(task: TrackedTask): Promise<void> {
                const target = this.taskTargetOrNotify(task);
                if (!target) {
                    return;
                }

                await openDeleteDataEditRequestEditorAction(target, (message) => {
                    this.statusMessage = message;
                });
            },
            refreshCurrentPageRfcStatuses(): void {
                for (const task of this.tasks) {
                    const section = findCurrentPageSection(task.pageTitle);
                    if (section === null || this.rfcStatusByPageTitle[task.pageTitle] !== undefined) {
                        continue;
                    }

                    void this.fetchCurrentPageRfcStatus(task.pageTitle, section);
                }
            },
            async fetchCurrentPageRfcStatus(pageTitle: string, section: string): Promise<void> {
                if (this.rfcStatusPromisesByPageTitle[pageTitle]) {
                    return this.rfcStatusPromisesByPageTitle[pageTitle];
                }

                const promise = (async () => {
                    try {
                        this.rfcStatusByPageTitle[pageTitle] = await isSectionOnRfc(currentPageTitle(), section);
                    } catch (error) {
                        console.warn('Failed to detect RFC status for tracked task:', error);
                    } finally {
                        delete this.rfcStatusPromisesByPageTitle[pageTitle];
                    }
                })();

                this.rfcStatusPromisesByPageTitle[pageTitle] = promise;
                return promise;
            },
            refreshComparisonTemplateStatuses(force = false): void {
                if (force) {
                    this.comparisonTemplateStatusByPageTitle = {};
                    this.comparisonTemplateStatusPromisesByPageTitle = {};
                }

                for (const task of this.tasks) {
                    const target = targetFromTaskPageTitle(task.pageTitle);
                    if (!target) {
                        continue;
                    }

                    if (this.comparisonTemplateStatusByPageTitle[task.pageTitle] !== undefined) {
                        continue;
                    }

                    void this.fetchComparisonTemplateStatus(task.pageTitle, target);
                }
            },
            async fetchComparisonTemplateStatus(
                pageTitle: string,
                target: TaskTarget,
            ): Promise<void> {
                if (this.comparisonTemplateStatusPromisesByPageTitle[pageTitle]) {
                    return this.comparisonTemplateStatusPromisesByPageTitle[pageTitle];
                }

                const promise = (async () => {
                    try {
                        const sectionWikitext = await fetchCurrentWikitext(target.pageTitle, target.section);
                        this.comparisonTemplateStatusByPageTitle[pageTitle] = containsComparisonTemplateContent(sectionWikitext);
                    } catch (error) {
                        console.warn('Failed to detect comparison template for tracked task:', error);
                        this.comparisonTemplateStatusByPageTitle[pageTitle] = false;
                    } finally {
                        delete this.comparisonTemplateStatusPromisesByPageTitle[pageTitle];
                    }
                })();

                this.comparisonTemplateStatusPromisesByPageTitle[pageTitle] = promise;
                return promise;
            },
            taskTargetOrNotify(task: TrackedTask): TaskTarget | null {
                const target = targetFromTaskPageTitle(task.pageTitle);
                if (target) {
                    return target;
                }

                this.statusMessage = wgULS('页面栏位需要包含章节锚点', '頁面欄位需要包含章節錨點');
                mw.notify(this.statusMessage, { type: 'error' });
                return null;
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

                console.error('Task tracker save hit an edit conflict:', error);
                try {
                    const remote = await wikiClient.load();
                    const remoteSnapshot = remote ? normalizeSnapshot(remote.config.taskTracker) : null;

                    if (remoteSnapshot && compareTimestamps(remoteSnapshot.updatedAt, snapshot.updatedAt) > 0) {
                        await this.applySnapshot(remoteSnapshot);
                        saveLocalSnapshot(remoteSnapshot);
                        this.statusMessage = wgULS(
                            '保存时检测到wiki资料较新，已载入wiki版本；未覆盖',
                            '儲存時偵測到wiki資料較新，已載入wiki版本；未覆蓋',
                        );
                    } else {
                        this.statusMessage = wgULS(
                            '保存时遇到编辑冲突；目前资料较新，请再按保存重试',
                            '儲存時遇到編輯衝突；目前資料較新，請再按儲存重試',
                        );
                    }

                    return true;
                } catch (loadError) {
                    console.error('Failed to reload task tracker data after save conflict:', loadError);
                    this.statusMessage = wgULS('保存遇到冲突，且重新载入失败：', '儲存遇到衝突，且重新載入失敗：') + errorMessage(loadError);
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

function isRaceError(error: unknown): boolean {
    const message = errorMessage(error);
    return /editconflict|articleexists|edit conflict/i.test(message);
}

function findExistingTask(tasks: TrackedTask[], seed: TaskSeed): TrackedTask | null {
    if (!seed.pageTitle) {
        return null;
    }

    return tasks.find((task) => task.pageTitle === seed.pageTitle) || null;
}

function compareDisplayTasks(
    left: { task: TrackedTask; index: number },
    right: { task: TrackedTask; index: number },
): number {
    const stageDifference = stageSortOrder[left.task.stage] - stageSortOrder[right.task.stage];
    if (stageDifference !== 0) {
        return stageDifference;
    }

    const dateDifference = createdAtSortValue(right.task.createdAt) - createdAtSortValue(left.task.createdAt); // Newer createdAt should come first
    if (dateDifference !== 0) {
        return dateDifference;
    }

    return left.index - right.index;
}

function createdAtSortValue(dateString: string): number {
    return utcDateValue(dateString) ?? Number.NEGATIVE_INFINITY;
}

function appendComparisonNotes(notes: string, content: string): string {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
        return notes;
    }

    const block = `==========比較條文==========\n${trimmedContent}`;
    return notes.trim()
        ? `${notes.replace(/\s*$/, '')}\n${block}`
        : block;
}

import {
    compareTimestamps,
    createSnapshot,
    createTask,
    daysSince,
    daysUntil,
    normalizeSnapshot,
    today,
} from './model';
import { loadLocalSnapshot, saveLocalSnapshot } from './storage';
import { injectTaskTrackerStyles } from './styles';
import { TASK_TRACKER_TEMPLATE } from './template';
import type { TaskSeed, TaskStage, TaskTrackerSnapshot, TrackedTask } from './types';
import { WikiConfigClient } from './wikiConfig';
import { openProposedChangesEditor } from '../proposed-changes-editor';
import { fetchCurrentWikitext } from '../proposed-changes-editor/api';
import { summarySuffix } from './constants';
import { rfcMatchRegex } from '../rfc-editor/constants';
import { isSectionOnRfc } from '../rfc-editor/api';
import { openRfcEditorForSection } from '../rfc-editor/open';
import { fetchBulletinLinkedPageTitles, normalizeBulletinPageTitle } from './bulletinStatus';
import { refreshEditsectionTrackingLinkLabels } from './editsectionLinks';
import { currentPageTitle, findCurrentPageSection } from './pageSections';
import {
    commentPublicNoticeTemplates,
    containsComparisonTemplateContent,
    containsRemovablePublicNoticeTemplates,
    extractComparisonTemplateContent,
} from './publicNoticeWikitext';
import { vueCompatOptions } from '../codex';
import { errorMessage } from '../mediawiki';

const wikiClient = new WikiConfigClient();
const stageSortOrder: Record<TaskStage, number> = {
    proposal: 0,
    publicNotice: 1,
    closed: 2,
};

const speedyDeleteTalkPageTitles = new Set([
    'wikipedia talk:快速删除',
    'wikipedia talk:快速刪除',
]);

type TaskWarning = {
    key: string;
    text: string;
    link?: string;
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
                const opened = window.open('https://zh.wikipedia.org/wiki/Template:Bulletin', '_blank', 'noopener,noreferrer');
                if (opened) {
                    opened.opener = null;
                }
            },
            openTaskPage(task: TrackedTask): void {
                if (!task.pageTitle) {
                    return;
                }

                const url = `https://zh.wikipedia.org/wiki/${encodeWikiTitle(task.pageTitle)}`;
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
                const days = daysSince(task.createdAt);
                if (days === null) {
                    return wgULS('发起日期未设置', '發起日期未設定');
                }

                return days === 0 ? wgULS('今日发起', '今日發起') : wgULS(`已发起 ${days} 日`, `已發起 ${days} 日`);
            },
            publicNoticeLabel(task: TrackedTask): string {
                if (!task.isPublicNotice && !task.publicNoticeEnd) {
                    return '';
                }

                const days = daysUntil(task.publicNoticeEnd);
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
            stageLabel(stage: TaskStage): string {
                return this.stageOptions.find((option: { value: TaskStage }) => option.value === stage)?.label || '提案';
            },
            rfcMismatchLabel(task: TrackedTask): string {
                const detected = this.rfcStatusByPageTitle[task.pageTitle];
                if (typeof detected !== 'boolean' || detected === task.hasRfc) {
                    return '';
                }

                return detected
                    ? wgULS('（检测到已挂RfC）', '（檢測到已掛RfC）')
                    : wgULS('（检测到未挂RfC）', '（檢測到未掛RfC）');
            },
            speedyDeleteDataWarning(task: TrackedTask): TaskWarning | null {
                if (task.stage === 'closed' || !hasPublicNoticeEnded(task) || !isSpeedyDeleteTalkTask(task)) {
                    return null;
                }

                return {
                    key: 'speedy-delete-data',
                    text: wgULS('公示结束后请修改', '公示結束後請修改'),
                    link: `https://zh.wikipedia.org/wiki/${encodeWikiTitle('Module:Delete/data')}`,
                };
            },
            taskWarnings(task: TrackedTask): TaskWarning[] {
                const warnings: Array<TaskWarning | null> = [
                    warningFromLabel('rfc-mismatch', this.rfcMismatchLabel(task)),
                    warningFromLabel('bulletin-mismatch', this.bulletinMismatchLabel(task)),
                    this.speedyDeleteDataWarning(task),
                ].filter(Boolean);

                return warnings as TaskWarning[];
            },
            canOpenRfcEditor(task: TrackedTask): boolean {
                return findCurrentPageSection(task.pageTitle) !== null;
            },
            bulletinMismatchLabel(task: TrackedTask): string {
                const detected = this.bulletinStatusByPageTitle[task.pageTitle];
                if (typeof detected !== 'boolean' || detected === task.hasBulletin) {
                    return '';
                }

                return detected
                    ? wgULS('（检测到已挂公告栏）', '（檢測到已掛公告欄）')
                    : wgULS('（检测到未挂公告栏）', '（檢測到未掛公告欄）');
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

                openProposedChangesEditor({
                    pageTitle: target.pageTitle,
                    placement: {
                        type: 'append-section-end',
                        section: target.section,
                    },
                    initialWikitext: `: {{subst:Make public|7|content=${task.title}|end=yes}}。--~~~~`,
                    dialogTitle: wgULS('发送公示留言', '發送公示留言'),
                    editSummary: wgULS('发送公示留言', '發送公示留言') + summarySuffix,
                    onSaved: (data) => {
                        const noticeDays = makePublicDays(data.proposedWikitext);
                        const endTimestamp = addUtcDays(new Date(), noticeDays);
                        const startDate = today();
                        task.publicNoticeStart = startDate;
                        task.publicNoticeEnd = utcDateString(endTimestamp);
                        task.isPublicNotice = true;

                        if (!task.hasRfc || !rfcMatchRegex.test(data.placedWikitext) || !confirm(wgULS(
                            '已发送公示留言。是否加入 {{Make public/rfc}}？',
                            '已發送公示留言。是否加入 {{Make public/rfc}}？',
                        ))) {
                            return;
                        }

                        setTimeout(() => {
                            this.openMakePublicRfcEditor(
                                target,
                                noticeDays,
                                formatChineseUtcTimestamp(endTimestamp),
                            );
                        }, 0);
                    },
                });
            },
            openPublicNoticePassedMessageEditor(task: TrackedTask): void {
                const target = this.taskTargetOrNotify(task);
                if (!target) {
                    return;
                }

                openProposedChangesEditor({
                    pageTitle: target.pageTitle,
                    placement: {
                        type: 'append-section-end',
                        section: target.section,
                    },
                    initialWikitext: ':: 公示通過。--~~~~',
                    dialogTitle: wgULS('发送公示通过留言', '發送公示通過留言'),
                    editSummary: wgULS('发送公示通过留言', '發送公示通過留言') + summarySuffix,
                    onSaved: (data) => {
                        task.isPublicNotice = false;

                        if (
                            !task.hasRfc
                            || !containsRemovablePublicNoticeTemplates(data.placedWikitext)
                            || !confirm(wgULS(
                                '已发送公示通过留言。是否注释移除 {{rfc}} / {{Make public/rfc}}？',
                                '已發送公示通過留言。是否註解移除 {{rfc}} / {{Make public/rfc}}？',
                            ))
                        ) {
                            return;
                        }

                        const commentedWikitext = commentPublicNoticeTemplates(data.placedWikitext);
                        if (commentedWikitext === data.placedWikitext) {
                            return;
                        }

                        setTimeout(() => {
                            this.openPublicNoticeTemplateRemovalEditor(target, commentedWikitext);
                        }, 0);
                    },
                });
            },
            openPublicNoticeTemplateRemovalEditor(
                target: { pageTitle: string; section: string },
                wikitext: string,
            ): void {
                openProposedChangesEditor({
                    pageTitle: target.pageTitle,
                    placement: {
                        type: 'full-replace',
                        section: target.section,
                    },
                    initialWikitext: wikitext,
                    dialogTitle: wgULS('注释公示相关模板', '註解公示相關模板'),
                    editSummary: wgULS('注释公示相关模板', '註解公示相關模板') + summarySuffix,
                });
            },
            openMakePublicRfcEditor(
                target: { pageTitle: string; section: string },
                days: number,
                endTimestamp: string,
            ): void {
                openProposedChangesEditor({
                    pageTitle: target.pageTitle,
                    placement: {
                        type: 'manual',
                        section: target.section,
                        buildSectionText: insertAfterRfcTemplate,
                    },
                    initialWikitext: `{{Make public/rfc|days=${days}|end=${endTimestamp}}}`,
                    dialogTitle: wgULS('加入公示RfC模板', '加入公示RfC模板'),
                    editSummary: wgULS('加入公示RfC模板', '加入公示RfC模板') + summarySuffix,
                });
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
                target: { pageTitle: string; section: string },
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
            taskTargetOrNotify(task: TrackedTask): { pageTitle: string; section: string } | null {
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return Number.NEGATIVE_INFINITY;
    }

    const value = Date.parse(`${dateString}T00:00:00Z`);
    return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function targetFromTaskPageTitle(pageTitle: string): { pageTitle: string; section: string } | null {
    const hashIndex = pageTitle.indexOf('#');
    if (hashIndex === -1) {
        return null;
    }

    const targetPageTitle = pageTitle.slice(0, hashIndex).trim();
    const section = pageTitle.slice(hashIndex + 1).trim();
    if (!targetPageTitle || !section) {
        return null;
    }

    return {
        pageTitle: targetPageTitle,
        section,
    };
}

function isSpeedyDeleteTalkTask(task: TrackedTask): boolean {
    const target = targetFromTaskPageTitle(task.pageTitle);
    if (!target) {
        return false;
    }

    return speedyDeleteTalkPageTitles.has(normalizeComparablePageTitle(target.pageTitle));
}

function warningFromLabel(key: string, text: string): TaskWarning | null {
    return text ? { key, text } : null;
}

function normalizeComparablePageTitle(pageTitle: string): string {
    return pageTitle
        .trim()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function makePublicDays(wikitext: string): number {
    const match = /{{\s*(?:subst:\s*)?Make[ _]public\s*\|\s*(\d+)/i.exec(wikitext);
    if (!match) {
        return 7;
    }

    const days = Number(match[1]);
    return Number.isFinite(days) && days > 0 ? days : 7;
}

function hasPublicNoticeEnded(task: TrackedTask): boolean {
    const days = daysUntil(task.publicNoticeEnd);
    return days !== null && days <= 0;
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

function addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86400000);
}

function utcDateString(date: Date): string {
    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
}

function formatChineseUtcTimestamp(date: Date): string {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return [
        `${date.getUTCFullYear()}年`,
        `${date.getUTCMonth() + 1}月`,
        `${date.getUTCDate()}日 `,
        `(${weekdays[date.getUTCDay()]}) `,
        `${String(date.getUTCHours()).padStart(2, '0')}:`,
        `${String(date.getUTCMinutes()).padStart(2, '0')} (UTC)`,
    ].join('');
}

function insertAfterRfcTemplate(existingSectionWikitext: string, proposedChangesWikitext: string): string {
    const match = rfcMatchRegex.exec(existingSectionWikitext);
    const proposed = proposedChangesWikitext.trim();
    if (!proposed) {
        return existingSectionWikitext;
    }

    if (!match) {
        throw new Error(wgULS('找不到 {{rfc}} 模板', '找不到 {{rfc}} 模板'));
    }

    const insertIndex = match.index + match[0].length;
    const before = existingSectionWikitext.slice(0, insertIndex).replace(/\s*$/, '');
    const after = existingSectionWikitext.slice(insertIndex).replace(/^\s*/, '');
    return after
        ? `${before}\n${proposed}\n${after}`
        : `${before}\n${proposed}\n`;
}

function encodeWikiTitle(pageTitle: string): string {
    return pageTitle
        .replace(/ /g, '_')
        .split('#')
        .map(encodeURIComponent)
        .join('#');
}

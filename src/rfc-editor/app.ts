import { doEdit } from './api';
import { isDryRun } from './global';
import { rfcTopicOptions, rfcTopics } from './constants';
import { RFC_EDITOR_TEMPLATE } from './template';
import { addRFCTemplate, constructEditSummary } from './wikitext';
import type { RfcDialogData } from './types';

export type RfcEditorAppInstance = {
    openDialog(data: RfcDialogData): void;
};

export function createRfcEditorApp(): object {
    return {
        name: 'NoticeboardRfcEditor',
        template: RFC_EDITOR_TEMPLATE,
        compatConfig: {
            MODE: 3,
        },
        compilerOptions: {
            whitespace: 'condense',
        },
        data() {
            return {
                open: false,
                dialogData: null as RfcDialogData | null,
                selectedTopics: [] as string[],
                reason: '',
                statusMessage: '',
                statusType: 'info',
                isSubmitting: false,
            };
        },
        computed: {
            dialogTitle(): string {
                return wgULS('编辑征求意见模板', '編輯徵求意見模板');
            },
            cancelLabel(): string {
                return wgULS('取消', '取消');
            },
            primaryAction(): Record<string, unknown> {
                return {
                    label: this.isSubmitting ? wgULS('提交中...', '提交中...') : wgULS('提交', '提交'),
                    actionType: 'progressive',
                    disabled: this.isSubmitting || !this.dialogData,
                };
            },
            defaultAction(): Record<string, unknown> {
                return {
                    label: wgULS('取消', '取消'),
                    disabled: this.isSubmitting,
                };
            },
            topicOptions(): Array<{ value: string; label: string }> {
                return [...rfcTopicOptions];
            },
            topicsLabel(): string {
                return wgULS('所属议题', '所屬議題');
            },
            topicsHelp(): string {
                return wgULS('本讨论应属于的征求意见主题', '本討論應屬於的徵求意見主題');
            },
            reasonLabel(): string {
                return wgULS('修改征求意见话题的原因', '修改徵求意見話題的原因');
            },
            reasonHelp(): string {
                return wgULS('显示於编辑摘要的额外资讯', '顯示於編輯摘要的額外資訊');
            },
            rfcidLabel(): string {
                return wgULS('征求意见话题编号', '徵求意見話題編號');
            },
            rfcidHelp(): string {
                return wgULS('由机器人填写的话题编号', '由機器人填寫的話題編號');
            },
            rfcidValue(): string {
                return this.dialogData?.rfcid || '';
            },
            dryrun(): boolean {
                return isDryRun();
            },
            contextMessage(): string {
                if (!this.dialogData) {
                    return '';
                }

                if (this.dialogData.topics.length === 0) {
                    return wgULS(
                        '此讨论尚未有征求意见模板。点按“提交”后，机器人将在十分钟内将此讨论加入征求意见系统。',
                        '此討論尚未有徵求意見模板。點按「提交」後，機器人將會在十分鐘內將此討論加入徵求意見系統。',
                    );
                }

                if (!this.dialogData.rfcid) {
                    return wgULS(
                        '此讨论已有征求意见模板，但机器人尚未运行。本话题将在十分钟后自动加入征求意见系统。本表单将修改本讨论串所属于的议题。',
                        '此討論已有徵求意見模板，但機器人尚未運行。本話題將在十分鐘後自動加入徵求意見系統。本表單將修改本討論串所屬於的議題。',
                    );
                }

                return wgULS(
                    '此讨论已有征求意见模板，且机器人已经运行。本表单将修改本讨论串所属于的议题，修改将于十分钟内应用。',
                    '此討論已有徵求意見模板，且機器人已經運行。本表單將修改本討論串所屬於的議題，修改將於十分鐘內應用。',
                );
            },
        },
        methods: {
            openDialog(data: RfcDialogData): void {
                this.dialogData = data;
                this.selectedTopics = [...data.topics];
                this.reason = '';
                this.statusMessage = '';
                this.statusType = 'info';
                this.open = true;
            },
            async submit(): Promise<void> {
                if (this.isSubmitting || !this.dialogData) {
                    return;
                }

                this.isSubmitting = true;

                try {
                    const data = this.dialogData;
                    const topics = this.normalizedSelectedTopics();
                    const newContent = addRFCTemplate(data.content, topics, data.rfcid);
                    const editSummary = constructEditSummary(data.topics, topics, this.reason);

                    if (newContent === data.content) {
                        mw.notify(wgULS('征求意见模板无修订，未应用编辑。', '徵求意見模板無修訂，未應用編輯。'), { type: 'warn' });
                        this.open = false;
                        return;
                    }

                    if (isDryRun()) {
                        console.log('Dry run mode - edit not submitted.', {
                            oldContent: data.content,
                            baserevid: data.revid,
                            newContent,
                            editSummary,
                        });
                        mw.notify(wgULS('试运行模式：编辑未提交。请在控制台查看详情。', '試運行模式：編輯未提交。請在主控臺查看詳情。'), { type: 'info' });
                        this.open = false;
                        return;
                    }

                    const editStatus = await doEdit(data.pagetitle, data.section, data.revid, newContent, editSummary);
                    if (!editStatus.success) {
                        const error = (editStatus as { error: unknown }).error;
                        console.error('Edit failed:', error);
                        this.statusType = 'error';
                        this.statusMessage = `${wgULS('无法更新征求意见模板', '無法更新徵求意見模板')}${mw.msg('colon-separator')}${this.errorMessage(error)}`;
                        mw.notify(this.statusMessage, { type: 'error' });
                        return;
                    }

                    mw.notify(
                        topics.length === 0
                            ? wgULS('征求意见模板已成功移除。', '徵求意見模板已成功移除。')
                            : wgULS('征求意见模板已成功更新。', '徵求意見模板已成功更新。'),
                        { type: 'success' },
                    );
                    this.open = false;
                    this.reloadPage();
                } finally {
                    this.isSubmitting = false;
                }
            },
            normalizedSelectedTopics(): string[] {
                return rfcTopics.filter((topic) => this.selectedTopics.includes(topic));
            },
            reloadPage(): void {
                const convenientDiscussions = (window as any).convenientDiscussions;
                if (convenientDiscussions?.api?.rebootPage) {
                    convenientDiscussions.api.rebootPage();
                    return;
                }

                window.location.reload();
            },
            errorMessage(error: unknown): string {
                return error instanceof Error ? error.message : String(error);
            },
        },
    };
}

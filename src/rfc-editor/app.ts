import { doEdit } from './api';
import { isDryRun } from './global';
import { rfcTopics } from './constants';
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
                return mw.msg('edit-rfc-window-title');
            },
            cancelLabel(): string {
                return mw.msg('edit-rfc-window-cancel');
            },
            primaryAction(): Record<string, unknown> {
                return {
                    label: this.isSubmitting ? wgULS('提交中...', '提交中...') : mw.msg('edit-rfc-window-confirm'),
                    actionType: 'progressive',
                    disabled: this.isSubmitting || !this.dialogData,
                };
            },
            defaultAction(): Record<string, unknown> {
                return {
                    label: mw.msg('edit-rfc-window-cancel'),
                    disabled: this.isSubmitting,
                };
            },
            topicOptions(): Array<{ value: string; label: string }> {
                return rfcTopics.map((topic) => ({
                    value: topic,
                    label: this.topicLabel(topic),
                }));
            },
            topicsLabel(): string {
                return mw.msg('edit-rfc-field-topics-label');
            },
            topicsHelp(): string {
                return mw.msg('edit-rfc-field-topics-help');
            },
            reasonLabel(): string {
                return mw.msg('edit-rfc-field-reason-label');
            },
            reasonHelp(): string {
                return mw.msg('edit-rfc-field-reason-help');
            },
            rfcidLabel(): string {
                return mw.msg('edit-rfc-field-rfcid-label');
            },
            rfcidHelp(): string {
                return mw.msg('edit-rfc-field-rfcid-help');
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
                    return mw.msg('edit-rfc-message-new-rfc');
                }

                if (!this.dialogData.rfcid) {
                    return mw.msg('edit-rfc-message-no-rfcid');
                }

                return mw.msg('edit-rfc-message-has-rfcid');
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
                        mw.notify(mw.msg('edit-rfc-notify-unchanged'), { type: 'warn' });
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
                        mw.notify(mw.msg('edit-rfc-notify-dryrun'), { type: 'info' });
                        this.open = false;
                        return;
                    }

                    const editStatus = await doEdit(data.pagetitle, data.section, data.revid, newContent, editSummary);
                    if (!editStatus.success) {
                        const error = (editStatus as { error: unknown }).error;
                        console.error('Edit failed:', error);
                        this.statusType = 'error';
                        this.statusMessage = `${mw.msg('edit-rfc-notify-fail')}${mw.msg('colon-separator')}${this.errorMessage(error)}`;
                        mw.notify(this.statusMessage, { type: 'error' });
                        return;
                    }

                    mw.notify(mw.msg(topics.length === 0 ? 'edit-rfc-notify-removed' : 'edit-rfc-notify-succeed'), { type: 'success' });
                    this.open = false;
                    this.reloadPage();
                } finally {
                    this.isSubmitting = false;
                }
            },
            normalizedSelectedTopics(): string[] {
                return rfcTopics.filter((topic) => this.selectedTopics.includes(topic));
            },
            topicLabel(topic: string): string {
                const key = `edit-rfc-topic-${topic}`;
                const label = mw.msg(key);
                return label === key ? topic : label;
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

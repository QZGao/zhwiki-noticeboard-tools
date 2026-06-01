import { fetchCurrentWikitext, fetchWikitextDiff, parseWikitext } from './api';
import {
    destroyCodeMirror,
    initializeCodeMirror,
    readCodeMirrorText,
    type CodeMirrorBinding,
} from './codeMirror';
import { buildPlacedWikitext, placementSection } from './placement';
import { injectProposedChangesEditorStyles } from './styles';
import { PROPOSED_CHANGES_EDITOR_TEMPLATE } from './template';
import type { ProposedChangesEditorOptions } from './types';

export type ProposedChangesEditorAppInstance = {
    openDialog(options: ProposedChangesEditorOptions): void;
};

export function createProposedChangesEditorApp(): object {
    return {
        name: 'NoticeboardProposedChangesEditor',
        template: PROPOSED_CHANGES_EDITOR_TEMPLATE,
        compatConfig: {
            MODE: 3,
        },
        compilerOptions: {
            whitespace: 'condense',
        },
        data() {
            return {
                open: false,
                options: null as ProposedChangesEditorOptions | null,
                currentStep: 0,
                totalSteps: 3,
                steps: [0, 1, 2],
                proposedWikitext: '',
                previewHtml: '',
                diffHtml: '',
                statusMessage: '',
                statusType: 'info',
                isLoading: false,
                codeMirrorBinding: null as CodeMirrorBinding | null,
            };
        },
        computed: {
            dialogTitle(): string {
                return this.options?.dialogTitle || wgULS('编辑拟议变更', '編輯擬議變更');
            },
            pageTitle(): string {
                return this.options?.pageTitle || '';
            },
            primaryAction(): Record<string, unknown> {
                if (this.currentStep === 0) {
                    return {
                        label: wgULS('预览', '預覽'),
                        actionType: 'primary',
                        disabled: this.isLoading || !this.options,
                    };
                }

                if (this.currentStep === 1) {
                    return {
                        label: wgULS('查看差异', '查看差異'),
                        actionType: 'primary',
                        disabled: this.isLoading || !this.options,
                    };
                }

                return {
                    label: wgULS('完成', '完成'),
                    actionType: 'progressive',
                    disabled: this.isLoading,
                };
            },
            defaultAction(): Record<string, unknown> {
                if (this.currentStep > 0) {
                    return {
                        label: wgULS('上一步', '上一步'),
                        disabled: this.isLoading,
                    };
                }

                return {
                    label: wgULS('取消', '取消'),
                    disabled: this.isLoading,
                };
            },
        },
        watch: {
            currentStep(step: number): void {
                if (step === 0 && this.open) {
                    void this.$nextTick().then(() => this.initCodeMirror());
                    return;
                }

                this.destroyCodeMirror();
            },
        },
        mounted(): void {
            injectProposedChangesEditorStyles();
        },
        methods: {
            openDialog(options: ProposedChangesEditorOptions): void {
                this.destroyCodeMirror();
                this.options = options;
                this.currentStep = 0;
                this.proposedWikitext = options.initialWikitext || '';
                this.previewHtml = '';
                this.diffHtml = '';
                this.statusMessage = '';
                this.statusType = 'info';
                this.isLoading = false;
                this.open = true;
                void this.$nextTick().then(() => this.initCodeMirror());
            },
            onTextareaInput(event: Event): void {
                this.proposedWikitext = (event.target as HTMLTextAreaElement).value;
            },
            async initCodeMirror(): Promise<void> {
                if (!this.open || this.currentStep !== 0 || this.codeMirrorBinding) {
                    return;
                }

                const textarea = document.getElementById('pcd-raw-editor') as HTMLTextAreaElement | null;
                if (!textarea) {
                    return;
                }

                textarea.value = this.proposedWikitext;
                this.codeMirrorBinding = await initializeCodeMirror(textarea, (value) => {
                    this.proposedWikitext = value;
                });
            },
            destroyCodeMirror(): void {
                destroyCodeMirror(this.codeMirrorBinding);
                this.codeMirrorBinding = null;
            },
            syncFromEditor(): void {
                if (this.codeMirrorBinding) {
                    this.proposedWikitext = readCodeMirrorText(this.codeMirrorBinding);
                    return;
                }

                const textarea = document.getElementById('pcd-raw-editor') as HTMLTextAreaElement | null;
                if (textarea) {
                    this.proposedWikitext = textarea.value;
                }
            },
            async onPrimaryAction(): Promise<void> {
                if (this.currentStep === 2) {
                    this.closeDialog();
                    return;
                }

                this.syncFromEditor();

                if (this.currentStep === 0) {
                    await this.showPreview();
                    return;
                }

                await this.showDiff();
            },
            onDefaultAction(): void {
                if (this.currentStep > 0) {
                    this.currentStep--;
                    return;
                }

                this.closeDialog();
            },
            onUpdateOpen(nextOpen: boolean): void {
                if (!nextOpen) {
                    this.closeDialog();
                }
            },
            closeDialog(): void {
                this.destroyCodeMirror();
                this.open = false;
            },
            async showPreview(): Promise<void> {
                if (!this.options || this.isLoading) {
                    return;
                }

                this.isLoading = true;
                this.statusMessage = '';
                try {
                    this.previewHtml = await parseWikitext(this.options.pageTitle, this.proposedWikitext);
                    this.currentStep = 1;
                } catch (error) {
                    this.showError(wgULS('生成预览失败：', '產生預覽失敗：') + this.errorMessage(error));
                } finally {
                    this.isLoading = false;
                }
            },
            async showDiff(): Promise<void> {
                if (!this.options || this.isLoading) {
                    return;
                }

                this.isLoading = true;
                this.statusMessage = '';
                try {
                    const section = placementSection(this.options.placement);
                    const currentWikitext = await fetchCurrentWikitext(this.options.pageTitle, section);
                    const placedWikitext = await buildPlacedWikitext(
                        this.options.placement,
                        currentWikitext,
                        this.proposedWikitext,
                    );
                    this.diffHtml = await fetchWikitextDiff(this.options.pageTitle, placedWikitext, section);
                    this.currentStep = 2;
                } catch (error) {
                    this.showError(wgULS('生成差异失败：', '產生差異失敗：') + this.errorMessage(error));
                } finally {
                    this.isLoading = false;
                }
            },
            showError(message: string): void {
                this.statusType = 'error';
                this.statusMessage = message;
                mw.notify(message, { type: 'error' });
            },
            errorMessage(error: unknown): string {
                return error instanceof Error ? error.message : String(error);
            },
        },
    };
}

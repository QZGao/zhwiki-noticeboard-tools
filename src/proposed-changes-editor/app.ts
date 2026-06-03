import {
    fetchCurrentWikitext,
    fetchCurrentWikitextRevision,
    fetchWikitextDiff,
    parseWikitext,
    saveWikitextRevision,
} from '../mediawiki';
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
import { vueCompatOptions } from '../codex';

export type ProposedChangesEditorAppInstance = {
    openDialog(options: ProposedChangesEditorOptions): void;
};

export function createProposedChangesEditorApp(): object {
    return {
        name: 'NoticeboardProposedChangesEditor',
        template: PROPOSED_CHANGES_EDITOR_TEMPLATE,
        ...vueCompatOptions(),
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
                isSaving: false,
                codeMirrorBinding: null as CodeMirrorBinding | null,
                isInitializingCodeMirror: false,
                codeMirrorGeneration: 0,
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
                    label: this.isSaving ? wgULS('保存中...', '儲存中...') : wgULS('保存', '儲存'),
                    actionType: 'progressive',
                    disabled: this.isLoading || this.isSaving || !this.options,
                };
            },
            defaultAction(): Record<string, unknown> {
                if (this.currentStep > 0) {
                    return {
                        label: wgULS('上一步', '上一步'),
                        disabled: this.isLoading || this.isSaving,
                    };
                }

                return {
                    label: wgULS('取消', '取消'),
                    disabled: this.isLoading || this.isSaving,
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
                this.codeMirrorGeneration++;
                this.options = options;
                this.currentStep = 0;
                this.proposedWikitext = options.initialWikitext || '';
                this.previewHtml = '';
                this.diffHtml = '';
                this.statusMessage = '';
                this.statusType = 'info';
                this.isLoading = false;
                this.isSaving = false;
                this.open = true;
                void this.$nextTick().then(() => this.initCodeMirror());
            },
            onTextareaInput(event: Event): void {
                this.proposedWikitext = (event.target as HTMLTextAreaElement).value;
            },
            async initCodeMirror(): Promise<void> {
                if (
                    !this.open
                    || this.currentStep !== 0
                    || this.codeMirrorBinding
                    || this.isInitializingCodeMirror
                ) {
                    return;
                }

                const generation = this.codeMirrorGeneration;
                const textarea = document.getElementById('pcd-raw-editor') as HTMLTextAreaElement | null;
                if (!textarea) {
                    return;
                }

                textarea.value = this.proposedWikitext;
                this.isInitializingCodeMirror = true;
                try {
                    const binding = await initializeCodeMirror(textarea, (value) => {
                        this.proposedWikitext = value;
                    });
                    if (
                        generation !== this.codeMirrorGeneration
                        || !this.open
                        || this.currentStep !== 0
                    ) {
                        destroyCodeMirror(binding);
                        return;
                    }

                    this.codeMirrorBinding = binding;
                } finally {
                    if (generation === this.codeMirrorGeneration) {
                        this.isInitializingCodeMirror = false;
                    }
                }
            },
            destroyCodeMirror(): void {
                this.codeMirrorGeneration++;
                this.isInitializingCodeMirror = false;
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
                    await this.saveChanges();
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
                if (this.isSaving) {
                    return;
                }

                if (this.currentStep > 0) {
                    this.currentStep--;
                    return;
                }

                this.closeDialog();
            },
            onUpdateOpen(nextOpen: boolean): void {
                if (!nextOpen) {
                    if (this.isSaving) {
                        this.open = true;
                        return;
                    }

                    this.closeDialog();
                }
            },
            closeDialog(force = false): void {
                if (this.isSaving && !force) {
                    this.open = true;
                    return;
                }

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
                    this.showError(wgULS('生成预览失败：', '產生預覽失敗：') + this.errorMessage(error), error);
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
                    if (this.options.placement.type === 'new-section') {
                        this.diffHtml = await fetchWikitextDiff(
                            this.options.pageTitle,
                            this.proposedWikitext.trim(),
                            null,
                            { newSection: true },
                        );
                        this.currentStep = 2;
                        return;
                    }

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
                    this.showError(wgULS('生成差异失败：', '產生差異失敗：') + this.errorMessage(error), error);
                } finally {
                    this.isLoading = false;
                }
            },
            async saveChanges(): Promise<void> {
                if (!this.options || this.isSaving) {
                    return;
                }

                this.isSaving = true;
                this.statusType = 'info';
                this.statusMessage = wgULS('保存中...', '儲存中...');
                try {
                    const section = placementSection(this.options.placement);
                    const current = await fetchCurrentWikitextRevision(this.options.pageTitle, section);
                    const placedWikitext = await buildPlacedWikitext(
                        this.options.placement,
                        current.content,
                        this.proposedWikitext,
                    );
                    const isNewSection = this.options.placement.type === 'new-section';
                    const submittedWikitext = isNewSection ? this.proposedWikitext.trim() : placedWikitext;

                    await saveWikitextRevision(
                        this.options.pageTitle,
                        isNewSection ? 'new' : current.resolvedSection,
                        submittedWikitext,
                        this.options.editSummary || this.dialogTitle,
                        current.basetimestamp,
                        current.curtimestamp,
                    );

                    await this.options.onSaved?.({
                        pageTitle: this.options.pageTitle,
                        section: isNewSection ? 'new' : current.resolvedSection,
                        proposedWikitext: this.proposedWikitext,
                        placedWikitext: submittedWikitext,
                    });

                    this.isSaving = false;
                    mw.notify(wgULS('已保存拟议变更。', '已儲存擬議變更。'), { type: 'success' });
                    this.closeDialog(true);
                } catch (error) {
                    this.isSaving = false;
                    this.showError(wgULS('保存失败：', '儲存失敗：') + this.errorMessage(error), error);
                }
            },
            showError(message: string, error?: unknown): void {
                console.error(message, error);
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

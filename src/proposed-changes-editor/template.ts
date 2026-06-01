export const PROPOSED_CHANGES_EDITOR_TEMPLATE = `
    <cdx-dialog
        class="pcd-dialog pcd-multistep-dialog"
        v-model:open="open"
        :title="dialogTitle"
        :use-close-button="true"
        :primary-action="primaryAction"
        :default-action="defaultAction"
        @primary="onPrimaryAction"
        @default="onDefaultAction"
        @update:open="onUpdateOpen"
    >
        <template #header>
            <div class="pcd-multistep-dialog__header-top">
                <h2>{{ dialogTitle }}</h2>
            </div>
            <div class="pcd-multistep-dialog__stepper">
                <div class="pcd-multistep-dialog__stepper__label">
                    {{ currentStep + 1 }} / {{ totalSteps }}
                </div>
                <div class="pcd-multistep-dialog__stepper__steps" aria-hidden="true">
                    <span
                        v-for="step in steps"
                        :key="step"
                        class="pcd-multistep-dialog__stepper__step"
                        :class="{ 'pcd-multistep-dialog__stepper__step--active': step <= currentStep }"
                    ></span>
                </div>
            </div>
        </template>

        <div class="pcd-dialog-body">
            <div class="pcd-target">{{ pageTitle }}</div>

            <div v-if="statusMessage" class="pcd-status" :class="'pcd-status--' + statusType">
                {{ statusMessage }}
            </div>

            <section v-if="currentStep === 0" class="pcd-form-section">
                <h3>${wgULS('原始码', '原始碼')}</h3>
                <textarea
                    id="pcd-raw-editor"
                    v-model="proposedWikitext"
                    class="pcd-raw-editor"
                    rows="14"
                    @input="onTextareaInput"
                ></textarea>
            </section>

            <section v-else-if="currentStep === 1" class="pcd-form-section">
                <h3>${wgULS('预览', '預覽')}</h3>
                <div v-if="isLoading" class="pcd-muted">${wgULS('载入中...', '載入中...')}</div>
                <div v-else class="pcd-preview mw-parser-output" v-html="previewHtml"></div>
            </section>

            <section v-else class="pcd-form-section">
                <h3>${wgULS('差异', '差異')}</h3>
                <div v-if="isSaving" class="pcd-saving" role="status" aria-live="polite">
                    <span class="pcd-saving__spinner"></span>
                    <span>${wgULS('保存中...', '儲存中...')}</span>
                </div>
                <div v-if="isLoading" class="pcd-muted">${wgULS('载入中...', '載入中...')}</div>
                <div v-else-if="diffHtml === ''" class="pcd-muted">${wgULS('没有差异', '沒有差異')}</div>
                <table v-else class="diff pcd-diff">
                    <colgroup>
                        <col class="diff-marker">
                        <col class="diff-content">
                        <col class="diff-marker">
                        <col class="diff-content">
                    </colgroup>
                    <tbody v-html="diffHtml"></tbody>
                </table>
            </section>
        </div>
    </cdx-dialog>
`;

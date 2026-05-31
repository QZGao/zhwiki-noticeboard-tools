export const RFC_EDITOR_TEMPLATE = `
    <cdx-dialog
        class="edit-rfc-dialog"
        v-model:open="open"
        :title="dialogTitle"
        :use-close-button="true"
        :close-button-label="cancelLabel"
        :primary-action="primaryAction"
        :default-action="defaultAction"
        @primary="submit"
        @default="open = false"
    >
        <form class="edit-rfc-form" @submit.prevent="submit">
            <div
                v-if="contextMessage"
                class="edit-rfc-message edit-rfc-message--info"
            >
                {{ contextMessage }}
            </div>

            <div
                v-if="dryrun"
                class="edit-rfc-message edit-rfc-message--warning"
            >
                ${wgULS('试运行模式已启用，编辑将不会提交。如希望退出试运行模式，请在控制台将', '試運行模式已啓用，編輯將不會提交。如希望退出試運行模式，請在主控臺將')}
                <code>EditRFC.dryrun</code>
                ${wgULS('设为', '設爲')}
                <code>false</code>
                ${wgULS('。', '。')}
            </div>

            <div
                v-if="statusMessage"
                class="edit-rfc-message"
                :class="'edit-rfc-message--' + statusType"
            >
                {{ statusMessage }}
            </div>

            <fieldset class="edit-rfc-fieldset">
                <legend>{{ topicsLabel }}</legend>
                <div class="edit-rfc-help">{{ topicsHelp }}</div>
                <div class="edit-rfc-topic-grid">
                    <label
                        v-for="topic in topicOptions"
                        :key="topic.value"
                        class="edit-rfc-topic"
                    >
                        <input
                            v-model="selectedTopics"
                            type="checkbox"
                            :value="topic.value"
                        >
                        <span>{{ topic.label }}</span>
                    </label>
                </div>
            </fieldset>

            <label class="edit-rfc-field">
                <span>{{ reasonLabel }}</span>
                <input
                    v-model.trim="reason"
                    type="text"
                    :placeholder="reasonHelp"
                >
            </label>

            <label class="edit-rfc-field">
                <span>{{ rfcidLabel }}</span>
                <input
                    :value="rfcidValue"
                    type="text"
                    :placeholder="rfcidHelp"
                    disabled
                >
            </label>
        </form>
    </cdx-dialog>
`;

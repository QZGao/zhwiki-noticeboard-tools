export const TASK_TRACKER_TEMPLATE = `
    <cdx-dialog
        class="ntt-dialog"
        v-model:open="open"
        title="站務提案追蹤"
        close-button-label="關閉"
        :use-close-button="true"
        :primary-action="primaryAction"
        :default-action="defaultAction"
        @primary="saveToWiki"
        @default="open = false"
    >
        <div class="ntt-task-tracker" @click="handleDialogContentClick">
            <div class="ntt-toolbar">
                <cdx-button @click.stop="addTask">新增任務</cdx-button>
                <span class="ntt-status">{{ statusMessage }}</span>
            </div>

            <div v-if="tasks.length === 0" class="ntt-empty">
                尚未追蹤任何提案。
            </div>

            <section
                v-for="task in tasks"
                :key="task.id"
                class="ntt-task"
                :class="{ 'ntt-task--editing': isEditing(task) }"
                :data-task-id="task.id"
                @click.stop="openTaskEditor(task.id)"
            >
                <div
                    v-if="!isEditing(task)"
                    class="ntt-task-summary"
                >
                    <div class="ntt-task-summary__main">
                        <div class="ntt-task-summary__title">
                            {{ task.title || '未命名提案' }}
                            <span v-if="task.notes" class="ntt-task-summary__note">
                                （{{ task.notes }}）
                            </span>
                        </div>
                        <div class="ntt-task-summary__meta">
                            <span>{{ stageLabel(task.stage) }}</span>
                            <span>{{ proposalAgeLabel(task) }}</span>
                            <span v-if="task.pageTitle">{{ task.pageTitle }}</span>
                            <span v-if="publicNoticeLabel(task)" :class="{ 'ntt-warning': isPublicNoticeOverdue(task) }">
                                {{ publicNoticeLabel(task) }}
                            </span>
                        </div>
                        <div class="ntt-task-flags">
                            <span v-if="task.hasRfc">RfC</span>
                            <span v-if="task.hasBulletin">公告欄</span>
                            <span v-if="task.isPublicNotice">公示中</span>
                            <span v-if="task.isArchived">已存檔</span>
                        </div>
                    </div>
                    <cdx-button
                        weight="quiet"
                        @click.stop="openTaskEditor(task.id)"
                    >
                        編輯
                    </cdx-button>
                </div>

                <div v-else class="ntt-task-editor">
                    <div class="ntt-task__header">
                        <label class="ntt-field">
                            <span>提案名稱</span>
                            <input v-model.trim="task.title" type="text" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>階段</span>
                            <select v-model="task.stage" @click.stop>
                                <option
                                    v-for="stage in stageOptions"
                                    :key="stage.value"
                                    :value="stage.value"
                                >
                                    {{ stage.label }}
                                </option>
                            </select>
                        </label>
                        <div class="ntt-task-editor__actions">
                            <cdx-button
                                weight="quiet"
                                @click.stop="closeTaskEditor"
                            >
                                完成
                            </cdx-button>
                            <cdx-button
                                action="destructive"
                                weight="quiet"
                                @click.stop="removeTask(task.id)"
                            >
                                移除
                            </cdx-button>
                        </div>
                    </div>

                    <div class="ntt-grid">
                        <label class="ntt-field">
                            <span>頁面</span>
                            <input v-model.trim="task.pageTitle" type="text" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>發起日期</span>
                            <input v-model="task.createdAt" type="date" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>公示開始</span>
                            <input v-model="task.publicNoticeStart" type="date" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>公示結束</span>
                            <input v-model="task.publicNoticeEnd" type="date" @click.stop>
                        </label>
                    </div>

                    <div class="ntt-checks">
                        <label class="ntt-check">
                            <input v-model="task.hasRfc" type="checkbox" @click.stop>
                            掛RfC
                        </label>
                        <label class="ntt-check">
                            <input v-model="task.hasBulletin" type="checkbox" @click.stop>
                            掛公告欄
                        </label>
                        <label class="ntt-check">
                            <input v-model="task.isPublicNotice" type="checkbox" @click.stop>
                            正在公示
                        </label>
                        <label class="ntt-check">
                            <input v-model="task.isArchived" type="checkbox" @click.stop>
                            已存檔
                        </label>
                    </div>

                    <label class="ntt-field">
                        <span>備註</span>
                        <textarea v-model="task.notes" @click.stop></textarea>
                    </label>

                    <div class="ntt-meta">
                        <span>{{ proposalAgeLabel(task) }}</span>
                        <span v-if="publicNoticeLabel(task)" :class="{ 'ntt-warning': isPublicNoticeOverdue(task) }">
                            · {{ publicNoticeLabel(task) }}
                        </span>
                    </div>
                </div>
            </section>
        </div>
    </cdx-dialog>
`;

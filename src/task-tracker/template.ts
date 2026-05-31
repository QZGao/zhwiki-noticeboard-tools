export const TASK_TRACKER_TEMPLATE = `
    <cdx-dialog
        class="ntt-dialog"
        v-model:open="open"
        title="${wgULS('站务提案追踪', '站務提案追蹤')}"
        close-button-label="${wgULS('关闭', '關閉')}"
        :use-close-button="true"
        :primary-action="primaryAction"
        :default-action="defaultAction"
        @primary="saveToWiki"
        @default="open = false"
    >
        <div class="ntt-task-tracker" @click="handleDialogContentClick">
            <div class="ntt-toolbar">
                <cdx-button @click.stop="addTask">${wgULS('新增任务', '新增任務')}</cdx-button>
                <span class="ntt-status">{{ statusMessage }}</span>
                <div class="ntt-toolbar__actions">
                    <cdx-button
                        weight="quiet"
                        @click.stop="openBulletinPage"
                    >
                        ${wgULS('打开', '打開')} <span v-pre>{{Bulletin}}</span>
                    </cdx-button>
                </div>
            </div>

            <div v-if="tasks.length === 0" class="ntt-empty">
                ${wgULS('尚未追踪任何提案。', '尚未追蹤任何提案。')}
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
                            {{ task.title || '${wgULS('未命名提案', '未命名提案')}' }}
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
                            <span v-if="task.hasBulletin">${wgULS('公告栏', '公告欄')}</span>
                            <span v-if="task.isPublicNotice">${wgULS('公示中', '公示中')}</span>
                            <span v-if="task.isArchived">${wgULS('已存档', '已存檔')}</span>
                        </div>
                    </div>
                    <cdx-button
                        weight="quiet"
                        @click.stop="openTaskEditor(task.id)"
                    >
                        ${wgULS('编辑', '編輯')}
                    </cdx-button>
                </div>

                <div v-else class="ntt-task-editor">
                    <div class="ntt-task__header">
                        <label class="ntt-field">
                            <span>${wgULS('提案名称', '提案名稱')}</span>
                            <input v-model.trim="task.title" type="text" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>${wgULS('阶段', '階段')}</span>
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
                                ${wgULS('完成', '完成')}
                            </cdx-button>
                            <cdx-button
                                action="destructive"
                                weight="quiet"
                                @click.stop="removeTask(task.id)"
                            >
                                ${wgULS('移除', '移除')}
                            </cdx-button>
                        </div>
                    </div>

                    <div class="ntt-grid">
                        <label class="ntt-field">
                            <span>
                                ${wgULS('页面', '頁面')}
                                <a
                                    v-if="task.pageTitle"
                                    href="#"
                                    class="ntt-field-link"
                                    @click.prevent.stop="openTaskPage(task)"
                                >${wgULS('打开', '打開')}</a>
                            </span>
                            <input v-model.trim="task.pageTitle" type="text" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>${wgULS('发起日期', '發起日期')}</span>
                            <input v-model="task.createdAt" type="date" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>${wgULS('公示开始', '公示開始')}</span>
                            <input v-model="task.publicNoticeStart" type="date" @click.stop>
                        </label>
                        <label class="ntt-field">
                            <span>${wgULS('公示结束', '公示結束')}</span>
                            <input v-model="task.publicNoticeEnd" type="date" @click.stop>
                        </label>
                    </div>

                    <div class="ntt-checks">
                        <label class="ntt-check">
                            <input v-model="task.hasRfc" type="checkbox" @click.stop>
                            ${wgULS('挂RfC', '掛RfC')}
                            <strong
                                v-if="rfcMismatchLabel(task)"
                                class="ntt-rfc-mismatch"
                            >
                                {{ rfcMismatchLabel(task) }}
                            </strong>
                            <a
                                v-if="canOpenRfcEditor(task)"
                                href="#"
                                class="ntt-rfc-edit-link"
                                @click.prevent.stop="openRfcEditorForTask(task)"
                            >${wgULS('编辑RfC', '編輯RfC')}</a>
                        </label>
                        <label class="ntt-check">
                            <input v-model="task.hasBulletin" type="checkbox" @click.stop>
                            ${wgULS('挂公告栏', '掛公告欄')}
                        </label>
                        <label class="ntt-check">
                            <input v-model="task.isPublicNotice" type="checkbox" @click.stop>
                            ${wgULS('正在公示', '正在公示')}
                        </label>
                        <label class="ntt-check">
                            <input v-model="task.isArchived" type="checkbox" @click.stop>
                            ${wgULS('已存档', '已存檔')}
                        </label>
                    </div>

                    <label class="ntt-field">
                        <span>${wgULS('备注', '備註')}</span>
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

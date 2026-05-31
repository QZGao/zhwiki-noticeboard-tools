import { ROOT_ID } from './constants';

const STYLE_ID = `${ROOT_ID}-styles`;

export function injectTaskTrackerStyles(): void {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    $('<style>')
        .attr('id', STYLE_ID)
        .text(`
            .ntt-dialog {
                box-sizing: border-box;
                width: min(960px, calc(100vw - 48px));
                max-width: calc(100vw - 48px);
            }
            .ntt-task-tracker {
                box-sizing: border-box;
                width: 100%;
                max-width: 100%;
                min-height: min(460px, calc(100vh - 220px));
                overflow-x: hidden;
            }
            .ntt-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            .ntt-status {
                color: #54595d;
                font-size: 0.875em;
                flex: 1 1 auto;
                min-width: 0;
                overflow-wrap: anywhere;
            }
            .ntt-toolbar__actions {
                display: flex;
                flex: 0 0 auto;
                flex-wrap: wrap;
                justify-content: flex-end;
                gap: 4px;
                margin-left: auto;
            }
            .ntt-task {
                border: 1px solid #a2a9b1;
                margin-bottom: 12px;
                padding: 12px;
                background: #fff;
                cursor: pointer;
                transition: border-color 120ms ease, background-color 120ms ease;
            }
            .ntt-task:hover {
                border-color: #72777d;
            }
            .ntt-task--editing {
                cursor: default;
                border-color: #36c;
                background: #f8f9fa;
            }
            .ntt-task--closed {
                border-color: #c8ccd1;
                background: #f8f9fa;
                color: #72777d;
            }
            .ntt-task--closed:hover {
                border-color: #a2a9b1;
            }
            .ntt-task-summary {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }
            .ntt-task-summary__main {
                min-width: 0;
            }
            .ntt-task-summary__title {
                font-weight: 600;
                overflow-wrap: anywhere;
            }
            .ntt-task--closed .ntt-task-summary__title {
                text-decoration: line-through;
            }
            .ntt-task-summary__note {
                color: #54595d;
                font-weight: normal;
            }
            .ntt-task-summary__meta,
            .ntt-task-flags {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 4px;
                color: #54595d;
                font-size: 0.875em;
            }
            .ntt-task-flags span {
                border: 1px solid #a2a9b1;
                border-radius: 2px;
                padding: 1px 6px;
                background: #fff;
                color: #202122;
            }
            .ntt-task-flags .ntt-task-flag--public-notice {
                border-color: #36c;
                color: #36c;
                font-weight: 700;
            }
            .ntt-task-editor {
                cursor: default;
            }
            .ntt-task__header,
            .ntt-grid,
            .ntt-checks {
                display: grid;
                gap: 8px;
            }
            .ntt-task__header {
                grid-template-columns: minmax(180px, 1fr) minmax(130px, 180px) auto;
                align-items: end;
            }
            .ntt-task-editor__actions {
                display: flex;
                justify-content: flex-end;
                gap: 4px;
            }
            .ntt-grid {
                grid-template-columns: repeat(4, minmax(120px, 1fr));
                margin-top: 8px;
            }
            .ntt-checks {
                grid-template-columns: repeat(5, minmax(120px, 1fr));
                margin-top: 8px;
            }
            .ntt-field {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .ntt-field > span,
            .ntt-check {
                font-size: 0.875em;
                color: #54595d;
            }
            .ntt-field-link {
                margin-left: 6px;
                font-weight: normal;
            }
            .ntt-field input,
            .ntt-field select,
            .ntt-field textarea {
                box-sizing: border-box;
                width: 100%;
            }
            .ntt-field textarea {
                min-height: 4.5em;
                resize: vertical;
            }
            .ntt-meta {
                margin-top: 8px;
                color: #54595d;
                font-size: 0.875em;
            }
            .ntt-warning {
                color: #b32424;
                font-weight: 600;
            }
            .ntt-rfc-mismatch {
                color: #b32424;
                font-weight: 700;
            }
            .ntt-bulletin-mismatch {
                color: #b32424;
                font-weight: 700;
            }
            .ntt-rfc-edit-link {
                margin-left: 4px;
                text-decoration: underline;
            }
            .ntt-empty {
                border: 1px dashed #a2a9b1;
                color: #54595d;
                padding: 20px;
                text-align: center;
            }
            @media (max-width: 720px) {
                .ntt-dialog {
                    width: calc(100vw - 24px);
                    max-width: calc(100vw - 24px);
                }
                .ntt-task-tracker {
                    min-height: 0;
                }
                .ntt-task__header,
                .ntt-grid,
                .ntt-checks {
                    grid-template-columns: 1fr;
                }
                .ntt-task-summary {
                    align-items: flex-start;
                }
                .ntt-task-editor__actions {
                    justify-content: flex-start;
                }
            }
        `)
        .appendTo(document.head);
}

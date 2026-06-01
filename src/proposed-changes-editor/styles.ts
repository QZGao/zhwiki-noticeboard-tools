const STYLE_ID = 'noticeboard-tools-proposed-changes-editor-styles';

export function injectProposedChangesEditorStyles(): void {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    $('<style>')
        .attr('id', STYLE_ID)
        .text(`
            .pcd-dialog {
                width: min(920px, calc(100vw - 48px));
                max-width: calc(100vw - 48px);
            }
            .pcd-multistep-dialog__header-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px 0;
            }
            .pcd-multistep-dialog__header-top h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            .pcd-multistep-dialog__stepper {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 24px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            .pcd-multistep-dialog__stepper__label {
                min-width: 36px;
                color: #54595d;
                font-size: 13px;
            }
            .pcd-multistep-dialog__stepper__steps {
                display: flex;
                gap: 6px;
            }
            .pcd-multistep-dialog__stepper__step {
                display: block;
                width: 12px;
                height: 12px;
                border-radius: 999px;
                background-color: #c8ccd1;
                transition: background-color 0.2s ease;
            }
            .pcd-multistep-dialog__stepper__step--active {
                background-color: #36c;
            }
            .pcd-dialog-body {
                min-height: 0;
            }
            .pcd-target {
                margin-bottom: 12px;
                color: #54595d;
                font-size: 13px;
                overflow-wrap: anywhere;
            }
            .pcd-form-section {
                padding: 8px 0 16px;
            }
            .pcd-form-section h3 {
                margin: 0 0 8px;
                font-size: 16px;
                font-weight: 600;
            }
            .pcd-raw-editor {
                box-sizing: border-box;
                width: 100%;
                min-height: 320px;
                font-family: monospace;
                resize: vertical;
            }
            .pcd-dialog .cm-editor {
                min-height: 320px;
                border: 1px solid #a2a9b1;
            }
            .pcd-dialog .cm-scroller {
                min-height: 320px;
            }
            .pcd-status {
                margin-bottom: 12px;
                padding: 8px 12px;
                border: 1px solid #a2a9b1;
                background: #f8f9fa;
            }
            .pcd-status--error {
                border-color: #b32424;
                background: #fee7e6;
                color: #b32424;
            }
            .pcd-muted {
                color: #54595d;
            }
            .pcd-saving {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                padding: 8px 12px;
                border: 1px solid #a2a9b1;
                background: #f8f9fa;
                color: #202122;
                font-weight: 600;
            }
            .pcd-saving__spinner {
                box-sizing: border-box;
                width: 16px;
                height: 16px;
                border: 2px solid #a2a9b1;
                border-top-color: #36c;
                border-radius: 50%;
                animation: pcd-saving-spin 800ms linear infinite;
            }
            @keyframes pcd-saving-spin {
                to {
                    transform: rotate(360deg);
                }
            }
            .pcd-preview {
                border: 1px solid #a2a9b1;
                padding: 12px;
                background: #fff;
            }
            .pcd-diff {
                width: 100%;
            }
            @media (max-width: 720px) {
                .pcd-dialog {
                    width: calc(100vw - 24px);
                    max-width: calc(100vw - 24px);
                }
                .pcd-dialog-body {
                    min-height: 0;
                }
            }
        `)
        .appendTo(document.head);
}

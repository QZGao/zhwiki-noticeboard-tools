import { inProgressLinkClass, linkGroupClass, messageClass, styleId } from './constants';
import { injectStyle } from '../dom';

export function injectRfcEditorStyles(): void {
    injectStyle(styleId, `
            .mw-editsection .${linkGroupClass}::before {
                content: ' | ';
            }

            .mw-editsection .${inProgressLinkClass} {
                color: var(--color-placeholder, #72777d);
                pointer-events: none;
            }

            .${messageClass} {
                margin-bottom: 12px;
                padding: 12px;
                border: 1px solid #a2a9b1;
                background: #f8f9fa;
            }

            .${messageClass}--info {
                border-color: #a2a9b1;
            }

            .${messageClass}--warning {
                border-color: #ac6600;
                background: #fffdf5;
            }

            .${messageClass}--error {
                border-color: #b32424;
                background: #fff7f7;
            }

            .edit-rfc-dialog {
                box-sizing: border-box;
                width: min(720px, calc(100vw - 48px));
                max-width: calc(100vw - 48px);
            }

            .edit-rfc-form {
                display: grid;
                gap: 12px;
            }

            .edit-rfc-fieldset {
                min-width: 0;
                margin: 0;
                padding: 12px;
                border: 1px solid #a2a9b1;
            }

            .edit-rfc-fieldset legend,
            .edit-rfc-field > span {
                font-weight: 600;
            }

            .edit-rfc-help {
                margin-bottom: 8px;
                color: #54595d;
                font-size: 0.875em;
            }

            .edit-rfc-topic-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px 16px;
            }

            .edit-rfc-topic {
                display: flex;
                align-items: flex-start;
                gap: 6px;
            }

            .edit-rfc-topic input {
                margin-top: 0.2em;
            }

            .edit-rfc-field {
                display: grid;
                gap: 4px;
            }

            .edit-rfc-field input {
                box-sizing: border-box;
                width: 100%;
            }

            @media (max-width: 720px) {
                .edit-rfc-dialog {
                    width: calc(100vw - 24px);
                    max-width: calc(100vw - 24px);
                }

                .edit-rfc-topic-grid {
                    grid-template-columns: 1fr;
                }
            }
        `);
}

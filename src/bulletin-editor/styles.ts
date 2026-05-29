export function injectStyles($wrapper: JQuery): void {
    $wrapper.append($('<style>').html(`
        .be-item-col {
            min-width: 600px;
        }
        .be-items {
            list-style-type: none;
            background: #ffffbb;
            min-height: 30px;
        }
        .be-type-text {
            width: 30px;
        }
        .be-item-col .be-item-type,
        .be-item-col .be-item-prefix,
        .be-item-col .be-item-suffix {
            display: none;
        }
        .be-moving .be-item-type,
        .be-moving .be-item-prefix,
        .be-moving .be-item-suffix {
            display: none;
        }
        .be-item-text {
            width: 90%;
        }
        #be-archive-zone .be-archive-btn {
            display: none;
        }
        #be-archive-zone {
            margin-bottom: 16px;
        }
        #be-editor {
            margin-bottom: 16px;
        }
        #be-conflict-box,
        #be-summary-box,
        #be-preview-box,
        #be-diff-box {
            margin-top: 16px;
            border: 1px solid;
        }
        #be-conflict-box {
            background: #fcc;
        }
        #be-conflict-label {
            font-weight: bold;
        }
        #be-summary {
            width: 50%;
        }
        .be-action-buttons {
            margin: 0.5em 0;
        }
        .be-action-buttons .oo-ui-widget {
            margin-right: 4px;
        }
    `));
}

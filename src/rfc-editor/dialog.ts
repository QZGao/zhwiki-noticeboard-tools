import { createRfcEditorApp, type RfcEditorAppInstance } from './app';
import { getEditRfcGlobal } from './global';
import type { RfcDialogData } from './types';

const ROOT_ID = 'noticeboard-tools-rfc-editor-root';

let instance: RfcEditorAppInstance | null = null;

export function openEditRFCDialog(data: RfcDialogData): void {
    const editor = mountRfcEditor();
    editor.openDialog(data);
}

function mountRfcEditor(): RfcEditorAppInstance {
    if (instance) {
        return instance;
    }

    let container = document.getElementById(ROOT_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = ROOT_ID;
        document.body.appendChild(container);
    }

    const { createMwApp } = mw.loader.require('vue');
    const { CdxDialog } = mw.loader.require('@wikimedia/codex');
    instance = createMwApp(createRfcEditorApp())
        .component('CdxDialog', CdxDialog)
        .mount(container) as RfcEditorAppInstance;

    const editRfc = getEditRfcGlobal();
    editRfc.editRFCDialog = createRfcEditorApp;
    editRfc.editRFCDialogInstance = instance;

    return instance;
}

import { createRfcEditorApp, type RfcEditorAppInstance } from './app';
import { getEditRfcGlobal } from './global';
import type { RfcDialogData } from './types';
import { mountCodexApp } from '../codex';
import { getOrCreateElement } from '../dom';

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

    instance = mountCodexApp<RfcEditorAppInstance>(
        createRfcEditorApp(),
        getOrCreateElement(ROOT_ID),
        ['CdxDialog'],
    );

    const editRfc = getEditRfcGlobal();
    editRfc.editRFCDialog = createRfcEditorApp;
    editRfc.editRFCDialogInstance = instance;

    return instance;
}

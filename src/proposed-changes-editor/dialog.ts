import {
    createProposedChangesEditorApp,
    type ProposedChangesEditorAppInstance,
} from './app';
import type { ProposedChangesEditorOptions } from './types';

const ROOT_ID = 'noticeboard-tools-proposed-changes-editor-root';

let instance: ProposedChangesEditorAppInstance | null = null;

export function openProposedChangesEditor(options: ProposedChangesEditorOptions): void {
    const editor = mountProposedChangesEditor();
    editor.openDialog(options);
}

function mountProposedChangesEditor(): ProposedChangesEditorAppInstance {
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
    instance = createMwApp(createProposedChangesEditorApp())
        .component('CdxDialog', CdxDialog)
        .mount(container) as ProposedChangesEditorAppInstance;

    return instance;
}

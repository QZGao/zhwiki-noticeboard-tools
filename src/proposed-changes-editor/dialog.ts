import {
    createProposedChangesEditorApp,
    type ProposedChangesEditorAppInstance,
} from './app';
import type { ProposedChangesEditorOptions } from './types';
import { mountCodexApp } from '../codex';
import { getOrCreateElement } from '../dom';

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

    instance = mountCodexApp<ProposedChangesEditorAppInstance>(
        createProposedChangesEditorApp(),
        getOrCreateElement(ROOT_ID),
        ['CdxDialog'],
    );

    return instance;
}

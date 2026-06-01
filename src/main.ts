
import { initBulletinEditor, shouldLoadBulletinEditor } from './bulletin-editor/main';
import {
    configureProposedChangesEditor,
    type CodeMirrorRequire,
    type CodeMirrorResource,
} from './proposed-changes-editor';
import { separatorMessageKeys } from './rfc-editor/constants';
import { initRfcEditor } from './rfc-editor/main';
import { initTaskTracker } from './task-tracker/main';

const commonModules = [
    'mediawiki.api',
    'mediawiki.util',
];

const bulletinEditorModules = [
    'ext.gadget.morebits',
    'mediawiki.diff.styles',
    'oojs-ui-core',
    'oojs-ui-widgets',
];

const codexModules = [
    'vue',
    '@wikimedia/codex',
];

const proposedChangesEditorModules = [
    'ext.CodeMirror',
    'ext.CodeMirror.mode.mediawiki',
    'mediawiki.diff.styles',
];

const legacyProposedChangesEditorModules = [
    'ext.CodeMirror.v6',
    'ext.CodeMirror.v6.mode.mediawiki',
    'mediawiki.diff.styles',
];

const editsectionNamespaces = new Set([
    1, // Talk
    4, // Project / Wikipedia
    5, // Project talk / Wikipedia talk
    9, // MediaWiki talk
    11, // Template talk
    100, // Portal
    101, // Portal talk
    102, // WikiProject
    103, // WikiProject talk
    829, // Module talk
]);

const loadCommonModules = createModuleLoader(commonModules);
const loadBulletinEditorModules = createModuleLoader(bulletinEditorModules);
const loadCodexModules = createModuleLoader(codexModules);

let rfcSeparatorMessagesPromise: Promise<unknown> | null = null;
let proposedChangesEditorResourcesPromise: Promise<CodeMirrorResource> | null = null;

async function init() {
    await loadCommonModules();
    await loadCodexModules();
    await loadRfcSeparatorMessages();

    configureProposedChangesEditor({
        loadCodeMirror: loadProposedChangesEditorResources,
    });

    const shouldLoadEditsectionFeatures = editsectionNamespaces.has(Number(mw.config.get('wgNamespaceNumber')));
    initTaskTracker(shouldLoadEditsectionFeatures);
    initRfcEditor(shouldLoadEditsectionFeatures);

    if (!shouldLoadBulletinEditor()) {
        return;
    }

    await loadBulletinEditorModules();
    initBulletinEditor();
}

void init();

function createModuleLoader(modules: string[]): () => Promise<unknown> {
    let promise: Promise<unknown> | null = null;

    return () => {
        if (!promise) {
            promise = Promise.resolve(mw.loader.using(modules)).catch((error: unknown) => {
                promise = null;
                throw error;
            });
        }

        return promise;
    };
}

function loadRfcSeparatorMessages(): Promise<unknown> {
    if (!rfcSeparatorMessagesPromise) {
        rfcSeparatorMessagesPromise = Promise.resolve(
            new mw.Api().loadMessagesIfMissing(separatorMessageKeys),
        ).catch((error: unknown) => {
            rfcSeparatorMessagesPromise = null;
            throw error;
        });
    }

    return rfcSeparatorMessagesPromise;
}

function loadProposedChangesEditorResources(): Promise<CodeMirrorResource> {
    if (!proposedChangesEditorResourcesPromise) {
        proposedChangesEditorResourcesPromise = loadCodeMirrorResource(
            proposedChangesEditorModules,
            'ext.CodeMirror',
            'ext.CodeMirror.mode.mediawiki',
        ).catch(() => loadCodeMirrorResource(
            legacyProposedChangesEditorModules,
            'ext.CodeMirror.v6',
            'ext.CodeMirror.v6.mode.mediawiki',
        )).catch((error: unknown) => {
            proposedChangesEditorResourcesPromise = null;
            throw error;
        });
    }

    return proposedChangesEditorResourcesPromise;
}

async function loadCodeMirrorResource(
    modules: string[],
    codeMirrorModule: string,
    modeModule: string,
): Promise<CodeMirrorResource> {
    const requireFn = await Promise.resolve(mw.loader.using(modules)) as CodeMirrorRequire;
    return {
        require: requireFn,
        codeMirrorModule,
        modeModule,
    };
}

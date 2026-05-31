
import { initBulletinEditor, shouldLoadBulletinEditor } from './bulletin-editor/main';
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

async function init() {
    await loadCommonModules();
    await loadCodexModules();
    await loadRfcSeparatorMessages();

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

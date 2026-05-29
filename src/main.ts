
import { initBulletinEditor, shouldLoadBulletinEditor } from './bulletin-editor/main';

const commonModules = [
    'mediawiki.api',
];

const bulletinEditorModules = [
    'ext.gadget.morebits',
    'mediawiki.diff.styles',
    'oojs-ui-core',
    'oojs-ui-widgets',
];

async function init() {
    if (!shouldLoadBulletinEditor()) {
        return;
    }

    await mw.loader.using([
        ...commonModules,
        ...bulletinEditorModules,
    ]);
    initBulletinEditor();
}

void init();


import { initBulletinEditor, shouldLoadBulletinEditor } from './bulletin-editor/main';
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

async function init() {
    await mw.loader.using(commonModules);
    initTaskTracker();

    if (!shouldLoadBulletinEditor()) {
        return;
    }

    await mw.loader.using(bulletinEditorModules);
    initBulletinEditor();
}

void init();

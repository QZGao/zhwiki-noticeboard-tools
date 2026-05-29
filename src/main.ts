
import { initBulletinEditor, shouldLoadBulletinEditor } from './bulletin-editor/main';

const commonModules = [
    'ext.gadget.morebits',
    'mediawiki.api',
    'mediawiki.diff.styles',
];

async function init() {
    if (!shouldLoadBulletinEditor()) {
        return;
    }

    await mw.loader.using(commonModules);
    initBulletinEditor();
}

void init();

import { PORTLET_LINK_ID, ROOT_ID } from './constants';
import { createTaskTrackerApp } from './app';

type TaskTrackerInstance = {
    openDialog(): void;
};

let instance: TaskTrackerInstance | null = null;
let mountPromise: Promise<TaskTrackerInstance> | null = null;

export function initTaskTracker(): void {
    $(addPortletLink);
}

function addPortletLink(): void {
    if (document.getElementById(PORTLET_LINK_ID)) {
        return;
    }

    const link = mw.util.addPortletLink(
        'p-tb',
        '#',
        '站務提案追蹤',
        PORTLET_LINK_ID,
        '開啟站務提案追蹤器',
    );

    if (!link) {
        return;
    }

    link.addEventListener('click', (event) => {
        event.preventDefault();
        void openTaskTracker();
    });
}

async function openTaskTracker(): Promise<void> {
    try {
        const tracker = await mountTaskTracker();
        tracker.openDialog();
    } catch (error) {
        mw.notify(`站務提案追蹤器載入失敗：${error instanceof Error ? error.message : String(error)}`, { type: 'error' });
    }
}

async function mountTaskTracker(): Promise<TaskTrackerInstance> {
    if (instance) {
        return instance;
    }

    if (mountPromise) {
        return mountPromise;
    }

    mountPromise = doMountTaskTracker();
    return mountPromise;
}

async function doMountTaskTracker(): Promise<TaskTrackerInstance> {
    await mw.loader.using([
        'vue',
        '@wikimedia/codex',
    ]);

    const container = document.createElement('div');
    container.id = ROOT_ID;
    document.body.appendChild(container);

    const { createMwApp } = mw.loader.require('vue');
    const { CdxButton, CdxDialog } = mw.loader.require('@wikimedia/codex');
    instance = createMwApp(createTaskTrackerApp())
        .component('CdxButton', CdxButton)
        .component('CdxDialog', CdxDialog)
        .mount(container) as TaskTrackerInstance;

    return instance;
}

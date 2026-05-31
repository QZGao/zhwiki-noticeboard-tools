import { PORTLET_LINK_ID, ROOT_ID } from './constants';
import { createTaskTrackerApp } from './app';
import { initEditsectionTrackingLinks } from './editsectionLinks';
import type { TaskSeed } from './types';

type TaskTrackerInstance = {
    openDialog(): void;
    addTaskAndOpen(seed: TaskSeed): Promise<void>;
};

let instance: TaskTrackerInstance | null = null;
let mountPromise: Promise<TaskTrackerInstance> | null = null;

export function initTaskTracker(): void {
    $(addPortletLink);
    initEditsectionTrackingLinks(openTaskTrackerWithTask);
}

function addPortletLink(): void {
    if (document.getElementById(PORTLET_LINK_ID)) {
        return;
    }

    const link = mw.util.addPortletLink(
        'p-tb',
        '#',
        wgULS('站务提案追踪', '站務提案追蹤'),
        PORTLET_LINK_ID,
        wgULS('开启站务提案追踪器', '開啟站務提案追蹤器'),
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
        mw.notify(wgULS('站务提案追踪器载入失败：', '站務提案追蹤器載入失敗：') + errorMessage(error), { type: 'error' });
    }
}

async function openTaskTrackerWithTask(seed: TaskSeed): Promise<void> {
    try {
        const tracker = await mountTaskTracker();
        await tracker.addTaskAndOpen(seed);
    } catch (error) {
        mw.notify(wgULS('站务提案追踪器载入失败：', '站務提案追蹤器載入失敗：') + errorMessage(error), { type: 'error' });
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

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

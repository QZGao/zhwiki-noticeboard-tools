import { PORTLET_LINK_ID, ROOT_ID } from './constants';
import { createTaskTrackerApp } from './app';
import { initEditsectionTrackingLinks } from './editsectionLinks';
import type { TaskSeed } from './types';
import { mountCodexApp } from '../codex';
import { errorMessage } from '../mediawiki';

type TaskTrackerInstance = {
    openDialog(): void;
    addOrOpenTask(seed: TaskSeed): Promise<void>;
};

let instance: TaskTrackerInstance | null = null;
let mountPromise: Promise<TaskTrackerInstance> | null = null;

export function initTaskTracker(shouldLoadEditsectionLinks: boolean): void {
    $(addPortletLink);
    if (shouldLoadEditsectionLinks) {
        initEditsectionTrackingLinks(openTaskTrackerWithTask);
    }
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
        console.error('Failed to open task tracker:', error);
        mw.notify(wgULS('站务提案追踪器载入失败：', '站務提案追蹤器載入失敗：') + errorMessage(error), { type: 'error' });
    }
}

async function openTaskTrackerWithTask(seed: TaskSeed): Promise<void> {
    try {
        const tracker = await mountTaskTracker();
        await tracker.addOrOpenTask(seed);
    } catch (error) {
        console.error('Failed to open task tracker with task:', error);
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
    const container = document.createElement('div');
    container.id = ROOT_ID;
    document.body.appendChild(container);

    instance = mountCodexApp<TaskTrackerInstance>(
        createTaskTrackerApp(),
        container,
        ['CdxButton', 'CdxDialog'],
    );

    return instance;
}

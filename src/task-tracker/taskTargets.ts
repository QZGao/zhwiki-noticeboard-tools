import type { TrackedTask } from './types';
import { normalizeComparablePageTitle } from '../wikiTitle';

export type TaskTarget = {
    pageTitle: string;
    section: string;
};

const speedyDeleteTalkPageTitles = new Set([
    'wikipedia talk:快速删除',
    'wikipedia talk:快速刪除',
]);

export function targetFromTaskPageTitle(pageTitle: string): TaskTarget | null {
    const hashIndex = pageTitle.indexOf('#');
    if (hashIndex === -1) {
        return null;
    }

    const targetPageTitle = pageTitle.slice(0, hashIndex).trim();
    const section = pageTitle.slice(hashIndex + 1).trim();
    if (!targetPageTitle || !section) {
        return null;
    }

    return {
        pageTitle: targetPageTitle,
        section,
    };
}

export function isSpeedyDeleteTalkTask(task: TrackedTask): boolean {
    const target = targetFromTaskPageTitle(task.pageTitle);
    if (!target) {
        return false;
    }

    return speedyDeleteTalkPageTitles.has(normalizeComparablePageTitle(target.pageTitle));
}

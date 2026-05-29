export const CONFIG_VERSION = 1;
export const TASK_TRACKER_VERSION = 1;
export const LOCAL_STORAGE_KEY = 'zhwiki-noticeboard-tools.task-tracker.v1';
export const ROOT_ID = 'noticeboard-tools-task-tracker-root';
export const PORTLET_LINK_ID = 't-noticeboard-tools-task-tracker';
export const summarySuffix = ' ([[User:SuperGrey/gadgets/NoticeboardTools|NoticeboardTools]])';

export function getConfigPageTitle(): string | null {
    const username = mw.config.get('wgUserName');
    return username ? `User:${username}/NoticeboardTools-config.json` : null;
}

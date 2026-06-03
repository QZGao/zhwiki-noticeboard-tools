import type { TrackedTask } from './types';
import { hasPublicNoticeEnded } from './model';
import { isSpeedyDeleteTalkTask } from './taskTargets';
import { wikiPageUrl } from '../wikiTitle';

export type TaskWarning = {
    key: string;
    text: string;
    link?: string;
};

export function rfcMismatchLabel(task: TrackedTask, detected: boolean | undefined): string {
    if (typeof detected !== 'boolean' || detected === task.hasRfc) {
        return '';
    }

    return detected
        ? wgULS('（检测到已挂RfC）', '（檢測到已掛RfC）')
        : wgULS('（检测到未挂RfC）', '（檢測到未掛RfC）');
}

export function bulletinMismatchLabel(task: TrackedTask, detected: boolean | undefined): string {
    if (typeof detected !== 'boolean' || detected === task.hasBulletin) {
        return '';
    }

    return detected
        ? wgULS('（检测到已挂公告栏）', '（檢測到已掛公告欄）')
        : wgULS('（检测到未挂公告栏）', '（檢測到未掛公告欄）');
}

export function speedyDeleteDataWarning(task: TrackedTask): TaskWarning | null {
    if (task.stage === 'closed' || !hasPublicNoticeEnded(task) || !isSpeedyDeleteTalkTask(task)) {
        return null;
    }

    return {
        key: 'speedy-delete-data',
        text: wgULS('公示结束后请修改', '公示結束後請修改'),
        link: wikiPageUrl('Module:Delete/data'),
    };
}

export function taskWarnings(task: TrackedTask, statuses: {
    bulletinDetected: boolean | undefined;
    rfcDetected: boolean | undefined;
}): TaskWarning[] {
    const warnings: Array<TaskWarning | null> = [
        warningFromLabel('rfc-mismatch', rfcMismatchLabel(task, statuses.rfcDetected)),
        warningFromLabel('bulletin-mismatch', bulletinMismatchLabel(task, statuses.bulletinDetected)),
        speedyDeleteDataWarning(task),
    ].filter(Boolean);

    return warnings as TaskWarning[];
}

function warningFromLabel(key: string, text: string): TaskWarning | null {
    return text ? { key, text } : null;
}

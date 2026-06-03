import type { TrackedTask } from './types';
import type { TaskTarget } from './taskTargets';
import { summarySuffix } from './constants';
import {
    commentPublicNoticeTemplates,
    containsRemovablePublicNoticeTemplates,
} from './publicNoticeWikitext';
import { rfcMatchRegex } from '../rfc-editor/constants';
import { openProposedChangesEditor } from '../proposed-changes-editor';
import {
    addUtcDays,
    formatChineseUtcTimestamp,
    utcDateString,
} from '../datetime';

export function openPublicNoticeMessageEditor(
    task: TrackedTask,
    target: TaskTarget,
    openMakePublicRfcEditor: (target: TaskTarget, days: number, endTimestamp: string) => void,
): void {
    openProposedChangesEditor({
        pageTitle: target.pageTitle,
        placement: {
            type: 'append-section-end',
            section: target.section,
        },
        initialWikitext: `: {{subst:Make public|7|content=${task.title}|end=yes}}。--~~~~`,
        dialogTitle: wgULS('发送公示留言', '發送公示留言'),
        editSummary: wgULS('发送公示留言', '發送公示留言') + summarySuffix,
        onSaved: (data) => {
            const noticeDays = makePublicDays(data.proposedWikitext);
            const endTimestamp = addUtcDays(new Date(), noticeDays);
            const startDate = utcDateString();
            task.publicNoticeStart = startDate;
            task.publicNoticeEnd = utcDateString(endTimestamp);
            task.isPublicNotice = true;

            if (!task.hasRfc || !rfcMatchRegex.test(data.placedWikitext) || !confirm(wgULS(
                '已发送公示留言。是否加入 {{Make public/rfc}}？',
                '已發送公示留言。是否加入 {{Make public/rfc}}？',
            ))) {
                return;
            }

            setTimeout(() => {
                openMakePublicRfcEditor(
                    target,
                    noticeDays,
                    formatChineseUtcTimestamp(endTimestamp),
                );
            }, 0);
        },
    });
}

export function openPublicNoticePassedMessageEditor(
    task: TrackedTask,
    target: TaskTarget,
    openPublicNoticeTemplateRemovalEditor: (target: TaskTarget, wikitext: string) => void,
): void {
    openProposedChangesEditor({
        pageTitle: target.pageTitle,
        placement: {
            type: 'append-section-end',
            section: target.section,
        },
        initialWikitext: ':: 公示通過。--~~~~',
        dialogTitle: wgULS('发送公示通过留言', '發送公示通過留言'),
        editSummary: wgULS('发送公示通过留言', '發送公示通過留言') + summarySuffix,
        onSaved: (data) => {
            task.isPublicNotice = false;

            if (
                !task.hasRfc
                || !containsRemovablePublicNoticeTemplates(data.placedWikitext)
                || !confirm(wgULS(
                    '已发送公示通过留言。是否注释移除 {{rfc}} / {{Make public/rfc}}？',
                    '已發送公示通過留言。是否註解移除 {{rfc}} / {{Make public/rfc}}？',
                ))
            ) {
                return;
            }

            const commentedWikitext = commentPublicNoticeTemplates(data.placedWikitext);
            if (commentedWikitext === data.placedWikitext) {
                return;
            }

            setTimeout(() => {
                openPublicNoticeTemplateRemovalEditor(target, commentedWikitext);
            }, 0);
        },
    });
}

export function openPublicNoticeTemplateRemovalEditor(target: TaskTarget, wikitext: string): void {
    openProposedChangesEditor({
        pageTitle: target.pageTitle,
        placement: {
            type: 'full-replace',
            section: target.section,
        },
        initialWikitext: wikitext,
        dialogTitle: wgULS('注释公示相关模板', '註解公示相關模板'),
        editSummary: wgULS('注释公示相关模板', '註解公示相關模板') + summarySuffix,
    });
}

export function openMakePublicRfcEditor(target: TaskTarget, days: number, endTimestamp: string): void {
    openProposedChangesEditor({
        pageTitle: target.pageTitle,
        placement: {
            type: 'manual',
            section: target.section,
            buildSectionText: insertAfterRfcTemplate,
        },
        initialWikitext: `{{Make public/rfc|days=${days}|end=${endTimestamp}}}`,
        dialogTitle: wgULS('加入公示RfC模板', '加入公示RfC模板'),
        editSummary: wgULS('加入公示RfC模板', '加入公示RfC模板') + summarySuffix,
    });
}

function makePublicDays(wikitext: string): number {
    const match = /{{\s*(?:subst:\s*)?Make[ _]public\s*\|\s*(\d+)/i.exec(wikitext);
    if (!match) {
        return 7;
    }

    const days = Number(match[1]);
    return Number.isFinite(days) && days > 0 ? days : 7;
}

function insertAfterRfcTemplate(existingSectionWikitext: string, proposedChangesWikitext: string): string {
    const match = rfcMatchRegex.exec(existingSectionWikitext);
    const proposed = proposedChangesWikitext.trim();
    if (!proposed) {
        return existingSectionWikitext;
    }

    if (!match) {
        throw new Error(wgULS('找不到 {{rfc}} 模板', '找不到 {{rfc}} 模板'));
    }

    const insertIndex = match.index + match[0].length;
    const before = existingSectionWikitext.slice(0, insertIndex).replace(/\s*$/, '');
    const after = existingSectionWikitext.slice(insertIndex).replace(/^\s*/, '');
    return after
        ? `${before}\n${proposed}\n${after}`
        : `${before}\n${proposed}\n`;
}

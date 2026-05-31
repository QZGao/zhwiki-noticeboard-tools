import type { TaskSeed } from './types';
import { isSectionOnRfc } from '../rfc-editor/api';
import {
    cacheCurrentPageHeadingSections,
    currentPageTitle,
    findHeadingForEditsection,
    pageTitleFromHeading,
    sectionFromEditsection,
} from './pageSections';

const LINK_GROUP_CLASS = 'noticeboard-tools-editsection-link-group';
const LINK_CLASS = 'noticeboard-tools-add-proposal-tracking';
const STYLE_ID = 'noticeboard-tools-editsection-link-style';

type OpenWithTask = (seed: TaskSeed) => Promise<void>;

export function initEditsectionTrackingLinks(openWithTask: OpenWithTask): void {
    injectEditsectionStyle();

    mw.hook('wikipage.content').add(($content: JQuery) => {
        addEditsectionLinks($content, openWithTask);
    });
}

function addEditsectionLinks($root: JQuery, openWithTask: OpenWithTask): void {
    cacheCurrentPageHeadingSections($root);

    const $editsections = $root.is('span.mw-editsection')
        ? $root
        : $root.find('span.mw-editsection');

    $editsections.each((_index, editsection) => {
        addEditsectionLink(editsection, openWithTask);
    });
}

function addEditsectionLink(editsection: HTMLElement, openWithTask: OpenWithTask): void {
    if (editsection.querySelector(`.${LINK_GROUP_CLASS}`)) {
        return;
    }

    const heading = findHeadingForEditsection(editsection);
    if (!heading?.id) {
        return;
    }

    const seed = createSeedFromHeading(heading);
    const section = sectionFromEditsection(editsection);
    const group = document.createElement('span');
    group.className = LINK_GROUP_CLASS;

    const link = document.createElement('a');
    link.className = LINK_CLASS;
    link.href = '#';
    link.textContent = wgULS('加入提案追踪', '加入提案追蹤');
    link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        void openWithDetectedRfcStatus(openWithTask, seed, section);
    });

    group.appendChild(link);

    const brackets = editsection.querySelectorAll('span.mw-editsection-bracket');
    const closingBracket = brackets.length > 0 ? brackets[brackets.length - 1] : null;
    editsection.insertBefore(group, closingBracket);
}

function createSeedFromHeading(heading: HTMLElement): TaskSeed {
    const title = heading.id;
    const createdAt = dateFromThreadId(heading.getAttribute('data-mw-thread-id'));
    const seed: TaskSeed = {
        title,
        pageTitle: pageTitleFromHeading(heading),
    };

    if (createdAt) {
        seed.createdAt = createdAt;
    }

    return seed;
}

async function detectRfcStatus(seed: TaskSeed, section: string | null): Promise<TaskSeed> {
    if (section === null) {
        return seed;
    }

    try {
        return {
            ...seed,
            hasRfc: await isSectionOnRfc(currentPageTitle(), section),
        };
    } catch (error) {
        console.warn('Failed to detect RFC status for task tracker seed:', error);
        return seed;
    }
}

async function openWithDetectedRfcStatus(
    openWithTask: OpenWithTask,
    seed: TaskSeed,
    section: string | null,
): Promise<void> {
    await openWithTask(await detectRfcStatus(seed, section));
}

function dateFromThreadId(threadId: string | null): string | null {
    const match = threadId?.match(/(\d{14})$/);
    if (!match) {
        return null;
    }

    return `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
}

function injectEditsectionStyle(): void {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    $('<style>')
        .attr('id', STYLE_ID)
        .text(`
            .mw-editsection .${LINK_GROUP_CLASS}::before {
                content: ' | ';
            }
        `)
        .appendTo(document.head);
}

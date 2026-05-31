import type { TaskSeed } from './types';

const LINK_GROUP_CLASS = 'noticeboard-tools-editsection-link-group';
const LINK_CLASS = 'noticeboard-tools-add-proposal-tracking';
const STYLE_ID = 'noticeboard-tools-editsection-link-style';
const ALLOWED_NAMESPACES = new Set([1, 4, 5, 9, 11, 829]);

type OpenWithTask = (seed: TaskSeed) => Promise<void>;

export function initEditsectionTrackingLinks(openWithTask: OpenWithTask): void {
    if (!ALLOWED_NAMESPACES.has(Number(mw.config.get('wgNamespaceNumber')))) {
        return;
    }

    injectEditsectionStyle();

    mw.hook('wikipage.content').add(($content: JQuery) => {
        addEditsectionLinks($content, openWithTask);
    });
}

function addEditsectionLinks($root: JQuery, openWithTask: OpenWithTask): void {
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
    const group = document.createElement('span');
    group.className = LINK_GROUP_CLASS;

    const link = document.createElement('a');
    link.className = LINK_CLASS;
    link.href = '#';
    link.textContent = wgULS('加入提案追踪', '加入提案追蹤');
    link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        void openWithTask(seed);
    });

    group.appendChild(link);

    const brackets = editsection.querySelectorAll('span.mw-editsection-bracket');
    const closingBracket = brackets.length > 0 ? brackets[brackets.length - 1] : null;
    editsection.insertBefore(group, closingBracket);
}

function findHeadingForEditsection(editsection: HTMLElement): HTMLElement | null {
    const headingContainer = editsection.closest('div.mw-heading');
    if (!headingContainer) {
        return null;
    }

    return Array.from(headingContainer.children).find((child): child is HTMLElement => {
        return /^H[2-6]$/.test(child.tagName) && Boolean((child as HTMLElement).id);
    }) || null;
}

function createSeedFromHeading(heading: HTMLElement): TaskSeed {
    const title = heading.id;
    const createdAt = dateFromThreadId(heading.getAttribute('data-mw-thread-id'));
    const seed: TaskSeed = {
        title,
        pageTitle: `${currentPageTitle()}#${title}`,
    };

    if (createdAt) {
        seed.createdAt = createdAt;
    }

    return seed;
}

function dateFromThreadId(threadId: string | null): string | null {
    const match = threadId?.match(/(\d{14})$/);
    if (!match) {
        return null;
    }

    return `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
}

function currentPageTitle(): string {
    return (mw.config.get('wgPageName') || '').replace(/_/g, ' ');
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

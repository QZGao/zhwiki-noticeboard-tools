const currentPageHeadingSections = new Map<string, string>();
let cachePrimed = false;

export function cacheCurrentPageHeadingSections($root?: JQuery): void {
    const $searchRoot = $root || $(document.body);
    const $editsections = $searchRoot.is('span.mw-editsection')
        ? $searchRoot
        : $searchRoot.find('span.mw-editsection');

    $editsections.each((_index, editsection) => {
        const heading = findHeadingForEditsection(editsection);
        const section = sectionFromEditsection(editsection);
        if (heading?.id && section !== null) {
            currentPageHeadingSections.set(pageTitleFromHeading(heading), section);
        }
    });

    cachePrimed = true;
}

export function findHeadingForEditsection(editsection: HTMLElement): HTMLElement | null {
    const headingContainer = editsection.closest('div.mw-heading');
    if (!headingContainer) {
        return null;
    }

    return Array.from(headingContainer.children).find((child): child is HTMLElement => {
        return /^H[2-6]$/.test(child.tagName) && Boolean((child as HTMLElement).id);
    }) || null;
}

export function sectionFromEditsection(editsection: HTMLElement): string | null {
    for (const link of Array.from(editsection.querySelectorAll('a'))) {
        const href = link.getAttribute('href');
        const section = href ? mw.util.getParamValue('section', href) : null;
        if (section !== null) {
            return section;
        }
    }

    return null;
}

export function findCurrentPageSection(pageTitle: string): string | null {
    if (!cachePrimed) {
        cacheCurrentPageHeadingSections();
    }

    return currentPageHeadingSections.get(pageTitle) || null;
}

export function pageTitleFromHeading(heading: HTMLElement): string {
    return `${currentPageTitle()}#${heading.id}`;
}

export function currentPageTitle(): string {
    return (mw.config.get('wgPageName') || '').replace(/_/g, ' ');
}

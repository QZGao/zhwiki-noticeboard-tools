export function encodeWikiTitle(pageTitle: string): string {
    return pageTitle
        .replace(/ /g, '_')
        .split('#')
        .map(encodeURIComponent)
        .join('#');
}

export function wikiPageUrl(pageTitle: string): string {
    return `https://zh.wikipedia.org/wiki/${encodeWikiTitle(pageTitle)}`;
}

export function normalizeComparablePageTitle(pageTitle: string): string {
    return pageTitle
        .trim()
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

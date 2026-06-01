import type { SectionId } from './types';

type ApiParams = Record<string, string | number | boolean | string[] | number[] | File | undefined>;

type QueryResponse = {
    curtimestamp?: string;
    query: {
        pages: Array<{
            missing?: boolean;
            revisions?: Array<{
                content?: string;
                timestamp?: string;
                diff?: {
                    body?: string;
                };
                slots?: {
                    main?: {
                        content?: string;
                        '*': string;
                    };
                };
            }>;
        }>;
    };
};

type ParseResponse = {
    parse: {
        text: string;
    };
};

type SectionsResponse = {
    parse: {
        sections: Array<{
            anchor?: string;
            index: string;
            line?: string;
        }>;
    };
};

export type CurrentWikitextRevision = {
    content: string;
    resolvedSection: string | null;
    basetimestamp: string;
    curtimestamp: string;
};

const api = new mw.Api();
const sectionIndexCache = new Map<string, Promise<string>>();

export async function parseWikitext(pageTitle: string, wikitext: string): Promise<string> {
    const data = await api.post({
        action: 'parse',
        contentmodel: 'wikitext',
        text: wikitext,
        title: pageTitle,
        prop: 'text',
        formatversion: '2',
    }) as ParseResponse;

    return data.parse.text;
}

export async function fetchCurrentWikitext(pageTitle: string, section: SectionId | null): Promise<string> {
    return (await fetchCurrentWikitextRevision(pageTitle, section)).content;
}

export async function fetchCurrentWikitextRevision(
    pageTitle: string,
    section: SectionId | null,
): Promise<CurrentWikitextRevision> {
    const resolvedSection = await resolveSectionIndex(pageTitle, section);
    const params: ApiParams = {
        action: 'query',
        prop: 'revisions',
        rvprop: ['content', 'timestamp'],
        rvslots: 'main',
        titles: pageTitle,
        formatversion: '2',
        curtimestamp: true,
    };

    if (resolvedSection !== null) {
        params.rvsection = resolvedSection;
    }

    const data = await api.get(params) as QueryResponse;
    const page = data.query.pages[0];
    if (!page || page.missing) {
        throw new Error(wgULS('页面不存在', '頁面不存在'));
    }

    const revision = page.revisions?.[0];
    if (!revision) {
        throw new Error('missing page revision');
    }

    return {
        content: revisionContent(revision),
        resolvedSection,
        basetimestamp: revision.timestamp || '',
        curtimestamp: data.curtimestamp || '',
    };
}

export async function fetchWikitextDiff(
    pageTitle: string,
    newWikitext: string,
    section: SectionId | null,
): Promise<string> {
    const resolvedSection = await resolveSectionIndex(pageTitle, section);
    const params: ApiParams = {
        action: 'query',
        prop: 'revisions',
        titles: pageTitle,
        rvdifftotext: newWikitext,
        rvslots: 'main',
        formatversion: '2',
    };

    if (resolvedSection !== null) {
        params.rvsection = resolvedSection;
    }

    const data = await api.post(params) as QueryResponse;
    return data.query.pages[0]?.revisions?.[0]?.diff?.body || '';
}

export async function saveWikitextRevision(
    pageTitle: string,
    section: string | null,
    wikitext: string,
    summary: string,
    basetimestamp: string,
    curtimestamp: string,
): Promise<void> {
    const params: ApiParams = {
        action: 'edit',
        title: pageTitle,
        text: wikitext,
        summary,
        watchlist: 'nochange',
        formatversion: '2',
    };

    if (basetimestamp) {
        params.basetimestamp = basetimestamp;
    }

    if (curtimestamp) {
        params.starttimestamp = curtimestamp;
    }

    if (section !== null) {
        params.section = section;
    }

    await api.postWithToken('csrf', params);
}

async function resolveSectionIndex(pageTitle: string, section: SectionId | null): Promise<string | null> {
    if (section === null) {
        return null;
    }

    const sectionValue = String(section);
    if (/^\d+$/.test(sectionValue)) {
        return sectionValue;
    }

    const cacheKey = `${pageTitle}#${sectionValue}`;
    let promise = sectionIndexCache.get(cacheKey);
    if (!promise) {
        promise = fetchSectionIndexByAnchor(pageTitle, sectionValue).catch((error: unknown) => {
            sectionIndexCache.delete(cacheKey);
            throw error;
        });
        sectionIndexCache.set(cacheKey, promise);
    }

    return promise;
}

async function fetchSectionIndexByAnchor(pageTitle: string, anchor: string): Promise<string> {
    const data = await api.get({
        action: 'parse',
        page: pageTitle,
        prop: 'sections',
        formatversion: '2',
    }) as SectionsResponse;

    const normalizedAnchor = normalizeSectionAnchor(anchor);
    const section = data.parse.sections.find((candidate) => {
        return normalizeSectionAnchor(candidate.anchor || candidate.line || '') === normalizedAnchor;
    });

    if (!section) {
        throw new Error(wgULS('找不到目标章节', '找不到目標章節'));
    }

    return section.index;
}

function normalizeSectionAnchor(anchor: string): string {
    const stripped = anchor.replace(/^#/, '');
    let decoded = stripped;
    try {
        decoded = decodeURIComponent(stripped);
    } catch {
        decoded = stripped;
    }

    return decoded.replace(/ /g, '_');
}

function revisionContent(revision: QueryResponse['query']['pages'][number]['revisions'][number]): string {
    return revision.content ?? revision.slots?.main?.content ?? revision.slots?.main?.['*'] ?? '';
}

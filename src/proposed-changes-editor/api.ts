import type { SectionId } from './types';
import {
    apiPostWithToken as mediaWikiApiPostWithToken,
    apiRequest as mediaWikiApiRequest,
    revisionContent,
    type ApiParams,
    type ApiRevision,
} from '../mediawiki';

type QueryResponse = {
    curtimestamp?: string;
    query: {
        pages: Array<{
            missing?: boolean;
            revisions?: ApiRevision[];
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
    const data = await apiPost<ParseResponse>({
        action: 'parse',
        contentmodel: 'wikitext',
        text: wikitext,
        title: pageTitle,
        prop: 'text',
        pst: true,
        formatversion: '2',
    });

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

    const data = await apiGet<QueryResponse>(params);
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
        rvdifftotextpst: true,
        formatversion: '2',
    };

    if (resolvedSection !== null) {
        params.rvsection = resolvedSection;
    }

    const data = await apiPost<QueryResponse>(params);
    return data.query.pages[0]?.revisions?.[0]?.diff?.body || '';
}

export async function fetchLatestRevisionId(pageTitle: string): Promise<number> {
    const data = await apiGet<QueryResponse>({
        action: 'query',
        prop: 'revisions',
        rvprop: 'ids',
        titles: pageTitle,
        formatversion: '2',
    });
    const page = data.query.pages[0];
    if (!page || page.missing) {
        throw new Error(wgULS('页面不存在', '頁面不存在'));
    }

    const revid = page.revisions?.[0]?.revid;
    if (typeof revid !== 'number') {
        throw new Error('missing page revision id');
    }

    return revid;
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

    await apiPostWithToken(params);
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
    const data = await apiGet<SectionsResponse>({
        action: 'parse',
        page: pageTitle,
        prop: 'sections',
        formatversion: '2',
    });

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

function apiGet<T>(params: ApiParams): Promise<T> {
    return apiRequest<T>('get', params);
}

function apiPost<T>(params: ApiParams): Promise<T> {
    return apiRequest<T>('post', params);
}

function apiPostWithToken(params: ApiParams): Promise<unknown> {
    return mediaWikiApiPostWithToken(api, params);
}

function apiRequest<T>(method: 'get' | 'post', params: ApiParams): Promise<T> {
    return mediaWikiApiRequest<T>(api, method, params);
}

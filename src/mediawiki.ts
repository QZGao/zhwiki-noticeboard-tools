export type ApiParams = Record<string, string | number | boolean | string[] | number[] | File | undefined>;

export type SectionId = string | number;

export type ApiRevision = {
    content?: string;
    timestamp?: string;
    revid?: number;
    slots?: {
        main?: {
            content?: string;
            '*': string;
        };
    };
};

export type ApiQueryPage = {
    missing?: boolean;
    revisions?: ApiRevision[];
};

export type ApiQueryResponse = {
    curtimestamp?: string;
    query: {
        pages: ApiQueryPage[];
    };
};

export type CurrentWikitextRevision = {
    content: string;
    revid: number | null;
    resolvedSection: string | null;
    basetimestamp: string;
    curtimestamp: string;
};

export type ParsedWikitext = {
    text: string;
    parsedSummary: string;
};

export type ParseWikitextOptions = {
    preSaveTransform?: boolean;
    summary?: string;
};

export type CompareWikitextDiffOptions = {
    fromWikitext?: string;
    preSaveTransform?: boolean;
    section?: string | null;
};

export type FetchWikitextRevisionOptions = {
    allowMissing?: boolean;
    includeCurrentTimestamp?: boolean;
    section?: SectionId | null;
    startRevisionId?: number;
};

type ApiCompareResponse = {
    compare?: {
        body?: string;
    };
};

type ParseResponse = {
    parse: {
        parsedsummary?: string;
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

const defaultApi = createLazyApi();
const sectionIndexCache = new Map<string, Promise<string>>();

export function createLazyApi(): () => any {
    let api: any = null;

    return () => {
        if (!api) {
            api = new mw.Api();
        }

        return api;
    };
}

export function revisionContent(revision: ApiRevision): string {
    return revision.content ?? revision.slots?.main?.content ?? revision.slots?.main?.['*'] ?? '';
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export async function parseWikitext(pageTitle: string, wikitext: string): Promise<string> {
    return (await parseWikitextPreview(defaultApi(), pageTitle, wikitext, {
        preSaveTransform: true,
    })).text;
}

export async function parseWikitextPreview(
    api: any,
    pageTitle: string,
    wikitext: string,
    options: ParseWikitextOptions = {},
): Promise<ParsedWikitext> {
    const params: ApiParams = {
        action: 'parse',
        contentmodel: 'wikitext',
        text: wikitext,
        title: pageTitle,
        prop: 'text',
        formatversion: '2',
    };

    if (options.preSaveTransform) {
        params.pst = true;
    }

    if (options.summary !== undefined) {
        params.summary = options.summary;
    }

    const data = await apiRequest<ParseResponse>(api, 'post', params);
    return {
        text: data.parse.text,
        parsedSummary: data.parse.parsedsummary || '',
    };
}

export async function fetchCurrentWikitext(pageTitle: string, section: SectionId | null): Promise<string> {
    return (await fetchCurrentWikitextRevision(pageTitle, section)).content;
}

export async function fetchCurrentWikitextRevision(
    pageTitle: string,
    section: SectionId | null,
): Promise<CurrentWikitextRevision> {
    return fetchPageWikitextRevision(defaultApi(), pageTitle, {
        includeCurrentTimestamp: true,
        section,
    });
}

export async function fetchPageWikitextRevision(
    api: any,
    pageTitle: string,
    options: FetchWikitextRevisionOptions = {},
): Promise<CurrentWikitextRevision> {
    const resolvedSection = await resolveSectionIndex(api, pageTitle, options.section ?? null);
    const params: ApiParams = {
        action: 'query',
        prop: 'revisions',
        rvprop: ['content', 'ids', 'timestamp'],
        rvslots: 'main',
        titles: pageTitle,
        formatversion: '2',
    };

    if (options.includeCurrentTimestamp) {
        params.curtimestamp = true;
    }

    if (options.startRevisionId !== undefined) {
        params.rvstartid = options.startRevisionId;
    }

    if (resolvedSection !== null) {
        params.rvsection = resolvedSection;
    }

    const data = await apiRequest<ApiQueryResponse>(api, 'get', params);
    const page = data.query.pages[0];
    if (!page || page.missing) {
        if (options.allowMissing) {
            return {
                content: '',
                revid: null,
                resolvedSection,
                basetimestamp: '',
                curtimestamp: data.curtimestamp || '',
            };
        }

        throw new Error(wgULS('页面不存在', '頁面不存在'));
    }

    const revision = page.revisions?.[0];
    if (!revision) {
        throw new Error('missing page revision');
    }

    return {
        content: revisionContent(revision),
        revid: typeof revision.revid === 'number' ? revision.revid : null,
        resolvedSection,
        basetimestamp: revision.timestamp || '',
        curtimestamp: data.curtimestamp || '',
    };
}

export async function fetchWikitextDiff(
    pageTitle: string,
    newWikitext: string,
    section: SectionId | null,
    options: { newSection?: boolean } = {},
): Promise<string> {
    const resolvedSection = options.newSection
        ? 'new'
        : await resolveSectionIndex(defaultApi(), pageTitle, section);
    return fetchCompareWikitextDiff(defaultApi(), pageTitle, newWikitext, {
        preSaveTransform: true,
        section: resolvedSection,
    });
}

export async function fetchCompareWikitextDiff(
    api: any,
    pageTitle: string,
    newWikitext: string,
    options: CompareWikitextDiffOptions = {},
): Promise<string> {
    const params: ApiParams = {
        action: 'compare',
        fromtitle: pageTitle,
        totitle: pageTitle,
        toslots: 'main',
        'totext-main': newWikitext,
        prop: 'diff',
        formatversion: '2',
    };

    if (options.fromWikitext !== undefined) {
        params.fromslots = 'main';
        params['fromtext-main'] = options.fromWikitext;
    }

    if (options.preSaveTransform) {
        params.topst = true;
    }

    if (options.section !== null && options.section !== undefined) {
        params['tosection-main'] = options.section;
    }

    const data = await apiRequest<ApiCompareResponse>(api, 'post', params);
    return data.compare?.body || '';
}

export async function fetchLatestRevisionId(pageTitle: string): Promise<number> {
    const data = await apiRequest<ApiQueryResponse>(defaultApi(), 'get', {
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

    await apiPostWithToken(defaultApi(), params);
}

export async function saveWikitextWithBaseRevision(
    api: any,
    pageTitle: string,
    section: string | null,
    baseRevisionId: number,
    wikitext: string,
    summary: string,
): Promise<unknown> {
    const params: ApiParams = {
        action: 'edit',
        title: pageTitle,
        baserevid: baseRevisionId,
        text: wikitext,
        summary,
        formatversion: '2',
    };

    if (section !== null) {
        params.section = section;
    }

    return apiPostWithToken(api, params);
}

export function apiRequest<T>(api: any, method: 'get' | 'post', params: ApiParams): Promise<T> {
    return new Promise((resolve, reject) => {
        api[method](params)
            .done((data: T) => resolve(data))
            .fail((code: unknown, result: unknown) => {
                reject(new MediaWikiApiError(method, code, result, params));
            });
    });
}

export function apiPostWithToken(api: any, params: ApiParams, tokenType = 'csrf'): Promise<unknown> {
    return new Promise((resolve, reject) => {
        api.postWithToken(tokenType, params)
            .done((data: unknown) => resolve(data))
            .fail((code: unknown, result: unknown) => {
                reject(new MediaWikiApiError('postWithToken', code, result, params));
            });
    });
}

export class MediaWikiApiError extends Error {
    readonly code: unknown;
    readonly result: unknown;
    readonly params: ApiParams;

    constructor(method: string, code: unknown, result: unknown, params: ApiParams) {
        super(apiErrorMessage(method, code, result));
        this.name = 'MediaWikiApiError';
        this.code = code;
        this.result = result;
        this.params = params;
    }
}

async function resolveSectionIndex(api: any, pageTitle: string, section: SectionId | null): Promise<string | null> {
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
        promise = fetchSectionIndexByAnchor(api, pageTitle, sectionValue).catch((error: unknown) => {
            sectionIndexCache.delete(cacheKey);
            throw error;
        });
        sectionIndexCache.set(cacheKey, promise);
    }

    return promise;
}

async function fetchSectionIndexByAnchor(api: any, pageTitle: string, anchor: string): Promise<string> {
    const data = await apiRequest<SectionsResponse>(api, 'get', {
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

function apiErrorMessage(method: string, code: unknown, result: unknown): string {
    const info = apiErrorInfo(result);
    const codeText = String(code || 'unknown');
    return info
        ? `MediaWiki API ${method} failed (${codeText}): ${info}`
        : `MediaWiki API ${method} failed (${codeText})`;
}

function apiErrorInfo(result: unknown): string {
    if (!result || typeof result !== 'object') {
        return '';
    }

    const error = (result as { error?: { info?: unknown } }).error;
    return typeof error?.info === 'string' ? error.info : '';
}

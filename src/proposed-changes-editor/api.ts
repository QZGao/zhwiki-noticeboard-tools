import type { SectionId } from './types';

type ApiParams = Record<string, string | number | boolean | string[] | number[] | File | undefined>;

type QueryResponse = {
    query: {
        pages: Array<{
            missing?: boolean;
            revisions?: Array<{
                content?: string;
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

const api = new mw.Api();

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
    const params: ApiParams = {
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        titles: pageTitle,
        formatversion: '2',
    };

    if (section !== null) {
        params.rvsection = String(section);
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

    return revisionContent(revision);
}

export async function fetchWikitextDiff(
    pageTitle: string,
    newWikitext: string,
    section: SectionId | null,
): Promise<string> {
    const params: ApiParams = {
        action: 'query',
        prop: 'revisions',
        titles: pageTitle,
        rvdifftotext: newWikitext,
        rvslots: 'main',
        formatversion: '2',
    };

    if (section !== null) {
        params.rvsection = String(section);
    }

    const data = await api.post(params) as QueryResponse;
    return data.query.pages[0]?.revisions?.[0]?.diff?.body || '';
}

function revisionContent(revision: QueryResponse['query']['pages'][number]['revisions'][number]): string {
    return revision.content ?? revision.slots?.main?.content ?? revision.slots?.main?.['*'] ?? '';
}

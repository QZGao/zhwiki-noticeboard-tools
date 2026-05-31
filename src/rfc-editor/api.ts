import { findRFCInSection } from './wikitext';
import type { EditStatus, RfcSectionAnalysis } from './types';

let api: any = null;

export function getApi(): any {
    if (!api) {
        api = new mw.Api();
    }

    return api;
}

export async function fetchAndAnalyseSection(title: string, section: string | null): Promise<RfcSectionAnalysis> {
    const params: Record<string, unknown> = {
        action: 'query',
        prop: 'revisions',
        titles: title,
        rvslots: 'main',
        rvprop: 'content|ids',
        formatversion: 2,
    };

    if (section !== null) {
        params.rvsection = section;
    }

    const response = await getApi().get(params);
    const page = response.query.pages[0];
    if (!page || page.missing) {
        throw new Error('Page not found');
    }

    const revision = page.revisions[0];
    const content = revision.slots.main.content;
    const rfcData = findRFCInSection(content);

    return {
        content,
        revid: revision.revid,
        topics: rfcData?.topics || [],
        rfcid: rfcData?.rfcid || null,
    };
}

export async function isSectionOnRfc(title: string, section: string | null): Promise<boolean> {
    const analysis = await fetchAndAnalyseSection(title, section);
    return analysis.topics.length > 0;
}

export async function doEdit(
    title: string,
    section: string | null,
    baserevid: number,
    content: string,
    summary: string,
): Promise<EditStatus> {
    const params: Record<string, unknown> = {
        action: 'edit',
        title,
        baserevid,
        text: content,
        summary,
        formatversion: 2,
    };

    if (section !== null) {
        params.section = section;
    }

    try {
        const response = await getApi().postWithEditToken(params);
        return { success: true, response };
    } catch (error) {
        return { success: false, error };
    }
}

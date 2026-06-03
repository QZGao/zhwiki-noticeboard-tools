import { findRFCInSection } from './wikitext';
import type { EditStatus, RfcSectionAnalysis } from './types';
import {
    createLazyApi,
    fetchPageWikitextRevision,
    saveWikitextWithBaseRevision,
} from '../mediawiki';

export const getApi = createLazyApi();

export async function fetchAndAnalyseSection(title: string, section: string | null): Promise<RfcSectionAnalysis> {
    const revision = await fetchPageWikitextRevision(getApi(), title, { section });
    if (revision.revid === null) {
        throw new Error('missing page revision id');
    }

    const content = revision.content;
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
    try {
        const response = await saveWikitextWithBaseRevision(
            getApi(),
            title,
            section,
            baserevid,
            content,
            summary,
        );
        return { success: true, response };
    } catch (error) {
        return { success: false, error };
    }
}

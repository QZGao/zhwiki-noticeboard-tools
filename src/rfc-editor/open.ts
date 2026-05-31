import { fetchAndAnalyseSection } from './api';
import { openEditRFCDialog } from './dialog';

export async function openRfcEditorForSection(title: string, section: string | null): Promise<void> {
    const analysis = await fetchAndAnalyseSection(title, section);
    openEditRFCDialog({
        pagetitle: title,
        section,
        content: analysis.content,
        revid: analysis.revid,
        topics: analysis.topics,
        rfcid: analysis.rfcid,
    });
}

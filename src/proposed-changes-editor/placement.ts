import type { ProposedChangesPlacement, SectionId } from './types';

export function placementSection(placement: ProposedChangesPlacement): SectionId | null {
    if (placement.type === 'manual' || placement.type === 'full-replace') {
        return placement.section ?? null;
    }

    if (placement.type === 'new-section') {
        return null;
    }

    return placement.section;
}

export async function buildPlacedWikitext(
    placement: ProposedChangesPlacement,
    existingWikitext: string,
    proposedWikitext: string,
): Promise<string> {
    if (placement.type === 'manual') {
        return placement.buildSectionText(existingWikitext, proposedWikitext);
    }

    if (placement.type === 'full-replace') {
        return proposedWikitext;
    }

    if (placement.type === 'new-section') {
        return proposedWikitext.trim();
    }

    if (placement.type === 'append-section-start') {
        return appendToSectionStart(existingWikitext, proposedWikitext, placement.separator);
    }

    return appendToSectionEnd(existingWikitext, proposedWikitext, placement.separator);
}

function appendToSectionEnd(existingWikitext: string, proposedWikitext: string, separator = '\n'): string {
    const proposed = proposedWikitext.trim();
    if (!proposed) {
        return existingWikitext;
    }

    if (!existingWikitext.trim()) {
        return `${proposed}\n`;
    }

    return `${existingWikitext.replace(/\s*$/, '')}${separator}${proposed}\n`;
}

function appendToSectionStart(existingWikitext: string, proposedWikitext: string, separator = '\n'): string {
    const proposed = proposedWikitext.trim();
    if (!proposed) {
        return existingWikitext;
    }

    const heading = /^(\s*=+\s*[^\n]+?\s*=+\s*\n?)/.exec(existingWikitext);
    if (!heading) {
        return `${proposed}${separator}${existingWikitext.replace(/^\s*/, '')}`;
    }

    const rest = existingWikitext.slice(heading[0].length).replace(/^\s*/, '');
    return `${heading[0]}${proposed}${rest ? `${separator}${rest}` : '\n'}`;
}

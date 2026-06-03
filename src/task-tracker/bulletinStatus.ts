import { bulletinTitle } from '../constants';
import { createLazyApi } from '../mediawiki';

const getApi = createLazyApi();

export async function fetchBulletinLinkedPageTitles(): Promise<Set<string>> {
    const response = await getApi().get({
        action: 'query',
        prop: 'revisions',
        titles: bulletinTitle,
        rvslots: 'main',
        rvprop: 'content',
        formatversion: 2,
    });

    const page = response.query.pages[0];
    if (!page || page.missing) {
        throw new Error('Template:Bulletin not found');
    }

    const content = page.revisions[0].slots.main.content;
    return parseBulletinLinkedPageTitles(content);
}

export function parseBulletinLinkedPageTitles(wikitext: string): Set<string> {
    const pageTitles = new Set<string>();
    const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(wikitext)) !== null) {
        const pageTitle = normalizeBulletinPageTitle(match[1]);
        if (pageTitle) {
            pageTitles.add(pageTitle);
        }
    }

    return pageTitles;
}

export function normalizeBulletinPageTitle(pageTitle: string): string {
    return pageTitle
        .trim()
        .replace(/^:/, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ');
}

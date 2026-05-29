import { flagEnd, flagStart } from './constants';
import type { BulletinRow, EditableRange, ParsedTemplate } from './types';

export function findEditableRange(bulletinText: string): EditableRange | null {
    const start = bulletinText.indexOf(flagStart);
    const end = bulletinText.indexOf(flagEnd);

    if (start === -1 || end === -1) {
        return null;
    }

    return {
        start,
        end,
        mainText: bulletinText.substring(start + flagStart.length, end),
    };
}

export function parseBulletinRows(mainText: string, morebits: any): BulletinRow[] {
    const rows: BulletinRow[] = [];
    const itemTemplatePattern = /{{\s*Bulletin\/item\s*\|/gi;
    let match = itemTemplatePattern.exec(mainText);

    while (match) {
        const template = morebits.wikitext.parseTemplate(mainText, match.index) as ParsedTemplate;
        const items: string[] = [];

        for (let i = 2; ; i++) {
            if (Object.prototype.hasOwnProperty.call(template.parameters, i)) {
                items.push(template.parameters[i]);
            } else {
                break;
            }
        }

        rows.push({
            type: template.parameters[1],
            prefix: template.parameters.prefix,
            suffix: template.parameters.suffix,
            items,
        });

        match = itemTemplatePattern.exec(mainText);
    }

    return rows;
}

export function mergeMainText(bulletinText: string, range: EditableRange, generatedText: string): string {
    return [
        bulletinText.substring(0, range.start + flagStart.length),
        '\n',
        generatedText,
        bulletinText.substring(range.end),
    ].join('');
}

export function mergeArchiveText(oldtext: string, archiveText: string, date: any): string {
    if (archiveText === '') {
        return oldtext;
    }

    const header = date.monthHeaderRegex().exec(oldtext);
    if (header !== null) {
        const idx = oldtext.indexOf(header[0]) + header[0].length;
        return `${oldtext.substring(0, idx)}\n${archiveText}${oldtext.substring(idx)}`;
    }

    let idx = oldtext.indexOf('\n==');
    if (idx === -1) {
        idx = 0;
    }

    return `${oldtext.substring(0, idx)}\n${date.monthHeader()}\n${archiveText}\n${oldtext.substring(idx)}`;
}

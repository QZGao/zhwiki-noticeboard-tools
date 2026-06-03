export type WikitextTemplate = {
    start: number;
    end: number;
    text: string;
    name: string;
    normalizedName: string;
    params: TemplateParameter[];
};

export type TemplateParameter = {
    key: string | null;
    value: string;
    raw: string;
};

export function findTemplates(wikitext: string, predicate?: (template: WikitextTemplate) => boolean): WikitextTemplate[] {
    const templates: WikitextTemplate[] = [];
    const stack: number[] = [];
    let index = 0;

    while (index < wikitext.length) {
        if (wikitext.startsWith('<!--', index)) {
            const commentEnd = wikitext.indexOf('-->', index + 4);
            index = commentEnd === -1 ? wikitext.length : commentEnd + 3;
            continue;
        }

        if (wikitext.startsWith('{{{', index)) {
            const parameterEnd = wikitext.indexOf('}}}', index + 3);
            index = parameterEnd === -1 ? index + 3 : parameterEnd + 3;
            continue;
        }

        if (wikitext.startsWith('{{', index)) {
            stack.push(index);
            index += 2;
            continue;
        }

        if (wikitext.startsWith('}}', index) && stack.length > 0) {
            const start = stack.pop()!;
            const end = index + 2;
            const template = parseTemplate(wikitext, start, end);
            if (template && (!predicate || predicate(template))) {
                templates.push(template);
            }
            index = end;
            continue;
        }

        index++;
    }

    return templates.sort((left, right) => left.start - right.start);
}

export function getTemplateParameter(template: WikitextTemplate, key: string | number): string | null {
    const wantedKey = String(key).trim();
    let positionalIndex = 0;

    for (const param of template.params) {
        if (param.key === null) {
            positionalIndex++;
            if (String(positionalIndex) === wantedKey) {
                return param.value;
            }
            continue;
        }

        if (param.key.trim() === wantedKey) {
            return param.value;
        }
    }

    return null;
}

export function replaceTemplates(
    wikitext: string,
    predicate: (template: WikitextTemplate) => boolean,
    replacement: (template: WikitextTemplate) => string,
): string {
    const matches = outermostTemplates(findTemplates(wikitext, predicate));
    let result = wikitext;

    for (let index = matches.length - 1; index >= 0; index--) {
        const template = matches[index];
        result = result.slice(0, template.start) + replacement(template) + result.slice(template.end);
    }

    return result;
}

export function normalizeTemplateName(name: string): string {
    return name
        .trim()
        .replace(/^(?:subst|safesubst):/i, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function parseTemplate(wikitext: string, start: number, end: number): WikitextTemplate | null {
    const text = wikitext.slice(start, end);
    const parts = splitTopLevel(text.slice(2, -2), '|');
    const name = parts[0]?.trim() || '';
    if (!name) {
        return null;
    }

    return {
        start,
        end,
        text,
        name,
        normalizedName: normalizeTemplateName(name),
        params: parts.slice(1).map(parseParameter),
    };
}

function parseParameter(raw: string): TemplateParameter {
    const equalsIndex = findTopLevelChar(raw, '=');
    if (equalsIndex > 0) {
        const key = raw.slice(0, equalsIndex).trim();
        if (key) {
            return {
                key,
                value: raw.slice(equalsIndex + 1),
                raw,
            };
        }
    }

    return {
        key: null,
        value: raw,
        raw,
    };
}

function splitTopLevel(text: string, separator: string): string[] {
    const parts: string[] = [];
    let start = 0;
    let index = 0;
    let templateDepth = 0;
    let linkDepth = 0;

    while (index < text.length) {
        if (text.startsWith('<!--', index)) {
            const commentEnd = text.indexOf('-->', index + 4);
            index = commentEnd === -1 ? text.length : commentEnd + 3;
            continue;
        }

        if (text.startsWith('{{{', index)) {
            const parameterEnd = text.indexOf('}}}', index + 3);
            index = parameterEnd === -1 ? index + 3 : parameterEnd + 3;
            continue;
        }

        if (text.startsWith('{{', index)) {
            templateDepth++;
            index += 2;
            continue;
        }

        if (text.startsWith('}}', index) && templateDepth > 0) {
            templateDepth--;
            index += 2;
            continue;
        }

        if (text.startsWith('[[', index)) {
            linkDepth++;
            index += 2;
            continue;
        }

        if (text.startsWith(']]', index) && linkDepth > 0) {
            linkDepth--;
            index += 2;
            continue;
        }

        if (text[index] === separator && templateDepth === 0 && linkDepth === 0) {
            parts.push(text.slice(start, index));
            start = index + 1;
        }

        index++;
    }

    parts.push(text.slice(start));
    return parts;
}

function findTopLevelChar(text: string, char: string): number {
    const parts = splitTopLevel(text, char);
    return parts.length > 1 ? parts[0].length : -1;
}

function outermostTemplates(templates: WikitextTemplate[]): WikitextTemplate[] {
    const outermost: WikitextTemplate[] = [];

    for (const template of templates) {
        const parent = outermost.find((candidate) => {
            return candidate.start <= template.start && template.end <= candidate.end;
        });
        if (!parent) {
            outermost.push(template);
        }
    }

    return outermost;
}

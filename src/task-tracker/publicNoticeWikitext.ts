import {
    findTemplates,
    getTemplateParameter,
    replaceTemplates,
    type WikitextTemplate,
} from '../wikitext';

const comparisonTemplateNames = new Set([
    '比較條文',
    '比较条文',
    'a+-',
    'cmpa',
    'cmp',
]);

const comparisonWrapperTemplateNames = new Set([
    '新增條文',
    '新增条文',
    '刪除條文',
    '删除条文',
    '差異條文',
    '差异条文',
    'a+',
    'a-',
    'a/=',
    'aa',
    'da',
]);

const removablePublicNoticeTemplateNames = new Set([
    'rfc',
    'rfc subpage',
    '徵求意見',
    '征求意见',
    'make public/rfc',
]);

export function containsComparisonTemplateContent(wikitext: string): boolean {
    return extractComparisonTemplateContent(wikitext) !== null;
}

export function extractComparisonTemplateContent(wikitext: string): string | null {
    const template = findTemplates(wikitext, isComparisonTemplate)[0];
    if (!template) {
        return null;
    }

    const newContent = getTemplateParameter(template, 2);
    if (newContent === null) {
        return null;
    }

    return stripComparisonWrappers(newContent).trim();
}

export function commentPublicNoticeTemplates(wikitext: string): string {
    return replaceTemplates(
        wikitext,
        isRemovablePublicNoticeTemplate,
        (template) => `<!-- ${template.text} -->`,
    );
}

export function containsRemovablePublicNoticeTemplates(wikitext: string): boolean {
    return findTemplates(wikitext, isRemovablePublicNoticeTemplate).length > 0;
}

function stripComparisonWrappers(wikitext: string): string {
    let result = wikitext;

    for (let index = 0; index < 20; index++) {
        const next = replaceTemplates(
            result,
            isComparisonWrapperTemplate,
            (template) => getTemplateParameter(template, 1) ?? '',
        );
        if (next === result) {
            return result;
        }

        result = next;
    }

    return result;
}

function isComparisonTemplate(template: WikitextTemplate): boolean {
    return comparisonTemplateNames.has(template.normalizedName);
}

function isComparisonWrapperTemplate(template: WikitextTemplate): boolean {
    return comparisonWrapperTemplateNames.has(template.normalizedName);
}

function isRemovablePublicNoticeTemplate(template: WikitextTemplate): boolean {
    return removablePublicNoticeTemplateNames.has(template.normalizedName);
}

export const additionalNamespaces = new Set([
    4, // Project
    100, // Portal
    102, // WikiProject
]);

export const rfcTopics = [
    'bio',
    'econ',
    'hist',
    'lang',
    'sci',
    'media',
    'pol',
    'reli',
    'soc',
    'style',
    'policy',
    'proj',
    'tech',
    'prop',
];

export const rfcMatchRegex = /{{(?:[Rr]f[Cc](?: subpage)?|[徵征]求意[見见])((?:\|[a-z]+)*?)(?:\|rfcid=([a-z0-9]+))?}}/;
export const skipMatchRegex = /^\s*{{(存[檔档][自至到]|[Ss]ave ?to|[Aa]rchive(?: ?to)|[Nn]osave|保存至|已?移[動动][自至到]|[Mm]oved?(?:(?: discussion | )?to)?|(?:[Mm]ov|[Ss]av|[Aa]rchiev)ed? ?from|[Ss]witchfrom|[Mm]OVEDFROM|[Mm]oved discussion from)(?:\|.*?)?}}\s*$/;

export const linkGroupClass = 'edit-rfc-section-link';
export const inProgressLinkClass = 'edit-rfc-section-link-inprogress';
export const messageClass = 'edit-rfc-message';
export const styleId = 'noticeboard-tools-rfc-editor-styles';

export const separatorMessageKeys = [
    'comma-separator',
    'colon-separator',
    'semicolon-separator',
    'parentheses',
];

export { summarySuffix } from '../constants';

export const rfcTopicOptions = [
    { value: 'bio', label: wgULS('传记', '傳記') },
    { value: 'econ', label: wgULS('经济、贸易与公司', '經濟、貿易與公司') },
    { value: 'hist', label: wgULS('历史与地理', '歷史與地理') },
    { value: 'lang', label: wgULS('语言及语言学', '語言及語言學') },
    { value: 'sci', label: wgULS('数学、科学与科技', '數學、科學與科技') },
    { value: 'media', label: wgULS('媒体、艺术与建筑', '媒體、藝術與建築') },
    { value: 'pol', label: wgULS('政治、政府与法律', '政治、政府與法律') },
    { value: 'reli', label: wgULS('宗教与哲学', '宗教與哲學') },
    { value: 'soc', label: wgULS('社会、体育运动与文化', '社會、體育運動與文化') },
    { value: 'style', label: wgULS('维基百科格式与命名', '維基百科格式與命名') },
    { value: 'policy', label: wgULS('维基百科方针与指引', '維基百科方針與指引') },
    { value: 'proj', label: wgULS('维基专题与协作', '維基專題與協作') },
    { value: 'tech', label: wgULS('维基百科技术议题与模板', '維基百科技術議題與模板') },
    { value: 'prop', label: wgULS('维基百科提议', '維基百科提議') },
];

export const rfcTopics = rfcTopicOptions.map((topic) => topic.value);

export function rfcTopicLabel(topic: string): string {
    return rfcTopicOptions.find((option) => option.value === topic)?.label || topic;
}

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

import { inProgressLinkClass, linkGroupClass } from './constants';
import { openEditRFCDialog } from './dialog';
import { getEditRfcGlobal } from './global';
import { openRfcEditorForSection } from './open';
import { injectRfcEditorStyles } from './styles';
import type { RfcDialogData } from './types';

export function initRfcEditor(shouldLoadEditsectionLinks: boolean): void {
    injectRfcEditorStyles();
    exposePublicApi();

    if (!shouldLoadEditsectionLinks) {
        return;
    }

    mw.hook('wikipage.content').add(($content: JQuery) => {
        addEditsectionLinks($content);
    });
}

function exposePublicApi(): void {
    const editRfc = getEditRfcGlobal();
    editRfc.openEditRFCDialog = (data: RfcDialogData) => {
        openEditRFCDialog(data);
    };
    editRfc.fetchAndOpenDialog = fetchAndOpenDialog;
}

function addEditsectionLinks($root: JQuery): void {
    const $editsections = $root.is('.mw-editsection')
        ? $root
        : $root.find('.mw-editsection');

    $editsections.each((_index, editsection) => {
        addEditsectionLink($(editsection));
    });
}

function addEditsectionLink($editsection: JQuery): void {
    if ($editsection.find(`.${linkGroupClass}`).length > 0) {
        return;
    }

    const $sectionLink = $editsection.find('a').first();
    const href = $sectionLink.attr('href');
    const section = href ? mw.util.getParamValue('section', href) : null;
    if (section === null) {
        return;
    }

    const title = String(mw.config.get('wgPageName') || '');
    const $link = $('<a>')
        .attr('href', '#')
        .text(wgULS('编辑RFC', '編輯RFC'))
        .on('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleLinkClick($link, title, section);
        });

    $('<span>')
        .addClass(linkGroupClass)
        .append($link)
        .insertBefore($editsection.find('.mw-editsection-bracket').last());
}

async function handleLinkClick(
    $link: JQuery,
    title: string,
    section: string,
): Promise<void> {
    $link
        .text(wgULS('正在载入……', '正在載入……'))
        .addClass(inProgressLinkClass);

    try {
        await fetchAndOpenDialog(title, section);
    } finally {
        $link
            .text(wgULS('编辑RFC', '編輯RFC'))
            .removeClass(inProgressLinkClass);
    }
}

async function fetchAndOpenDialog(
    title: string,
    section: string | null,
): Promise<void> {
    try {
        await openRfcEditorForSection(title, section);
    } catch (error) {
        console.error('Failed to fetch RFC section data:', error);
        mw.notify(
            `${wgULS('无法载入章节资料', '無法載入章節資料')}${mw.msg('colon-separator')}${errorMessage(error)}`,
            { type: 'error' },
        );
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

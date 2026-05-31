import { additionalNamespaces, inProgressLinkClass, linkGroupClass } from './constants';
import { fetchAndAnalyseSection } from './api';
import { openEditRFCDialog } from './dialog';
import { getEditRfcGlobal } from './global';
import { registerRfcEditorMessages } from './messages';
import { injectRfcEditorStyles } from './styles';
import type { RfcDialogData } from './types';

export function initRfcEditor(): void {
    if (!shouldLoadRfcEditor()) {
        return;
    }

    registerRfcEditorMessages();
    injectRfcEditorStyles();
    exposePublicApi();

    mw.hook('wikipage.content').add(($content: JQuery) => {
        addEditsectionLinks($content);
    });
}

function shouldLoadRfcEditor(): boolean {
    if (getEditRfcGlobal().loadAnywhere) {
        return true;
    }

    const namespaceNumber = Number(mw.config.get('wgNamespaceNumber'));
    return namespaceNumber % 2 === 1 || additionalNamespaces.has(namespaceNumber);
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
        .text(mw.msg('edit-rfc-button'))
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
        .text(mw.msg('edit-rfc-button-inprogress'))
        .addClass(inProgressLinkClass);

    try {
        await fetchAndOpenDialog(title, section);
    } finally {
        $link
            .text(mw.msg('edit-rfc-button'))
            .removeClass(inProgressLinkClass);
    }
}

async function fetchAndOpenDialog(
    title: string,
    section: string | null,
): Promise<void> {
    try {
        const analysis = await fetchAndAnalyseSection(title, section);
        openEditRFCDialog({
            pagetitle: title,
            section,
            content: analysis.content,
            revid: analysis.revid,
            topics: analysis.topics,
            rfcid: analysis.rfcid,
        });
    } catch (error) {
        console.error('Failed to fetch RFC section data:', error);
        mw.notify(
            `${mw.msg('edit-rfc-fetch-fail')}${mw.msg('colon-separator')}${errorMessage(error)}`,
            { type: 'error' },
        );
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

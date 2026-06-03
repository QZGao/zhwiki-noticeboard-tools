import type { TaskTarget } from './taskTargets';
import { summarySuffix } from './constants';
import { openProposedChangesEditor } from '../proposed-changes-editor';
import {
    errorMessage,
    fetchCurrentWikitext,
    fetchLatestRevisionId,
} from '../mediawiki';
import { utcDateString } from '../datetime';

const deleteDataTitle = 'Module:Delete/data';
const deleteDataSandboxTitle = 'Module:Delete/data/sandbox';
const deleteDataTalkTitle = 'Module talk:Delete/data';

export async function openDeleteDataSandboxEditor(
    setStatusMessage: (message: string) => void,
): Promise<void> {
    const targetName = `noticeboard-tools-delete-data-sandbox-${Date.now()}`;
    const opened = window.open('about:blank', targetName);
    if (opened) {
        opened.opener = null;
        opened.document.title = wgULS('正在载入编辑器', '正在載入編輯器');
        opened.document.body.textContent = wgULS('正在载入 Module:Delete/data 内容……', '正在載入 Module:Delete/data 內容……');
    }

    try {
        const content = await fetchCurrentWikitext(deleteDataTitle, null);
        openEditFormWithText(
            deleteDataSandboxTitle,
            content,
            wgULS('同步 Module:Delete/data', '同步 Module:Delete/data'),
            targetName,
        );
    } catch (error) {
        console.error('Failed to open Module:Delete/data/sandbox editor:', error);
        const message = wgULS(
            '载入 Module:Delete/data 失败：',
            '載入 Module:Delete/data 失敗：',
        ) + errorMessage(error);
        setStatusMessage(message);
        mw.notify(message, { type: 'error' });

        if (opened) {
            opened.close();
        }
    }
}

export async function openDeleteDataEditRequestEditor(
    target: TaskTarget,
    setStatusMessage: (message: string) => void,
): Promise<void> {
    try {
        const date = utcDateString(new Date());
        const sectionTitle = `編輯請求 ${date}`;
        const sandboxRevid = await fetchLatestRevisionId(deleteDataSandboxTitle);
        openProposedChangesEditor({
            pageTitle: deleteDataTalkTitle,
            placement: {
                type: 'new-section',
            },
            initialWikitext: buildDeleteDataEditRequestWikitext(
                sectionTitle,
                `${target.pageTitle}#${target.section}`,
                sandboxRevid,
            ),
            dialogTitle: wgULS(
                '发送编辑请求到Module talk:Delete/data',
                '發送編輯請求到Module talk:Delete/data',
            ),
            editSummary: sectionTitle + summarySuffix,
        });
    } catch (error) {
        console.error('Failed to open Module:Delete/data edit request editor:', error);
        const message = wgULS(
            '载入 Module:Delete/data/sandbox 版本失败：',
            '載入 Module:Delete/data/sandbox 版本失敗：',
        ) + errorMessage(error);
        setStatusMessage(message);
        mw.notify(message, { type: 'error' });
    }
}

function buildDeleteDataEditRequestWikitext(
    sectionTitle: string,
    taskSectionTitle: string,
    sandboxRevid: number,
): string {
    return [
        '{{subst:提出代為編輯請求',
        `|章節標題 = ${sectionTitle}`,
        `|patch = ${deleteDataSandboxTitle}`,
        '|rfc = ',
        `|請求內容 = 見 [[${taskSectionTitle}]]。沙盒：[[Special:PermaLink/${sandboxRevid}]]。`,
        '|簽名 = --~~~~',
        '}}',
    ].join('\n');
}

function openEditFormWithText(
    pageTitle: string,
    text: string,
    summary: string,
    targetName: string,
): void {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = mw.util.getUrl(pageTitle, { action: 'submit' });
    form.target = targetName;
    form.style.display = 'none';

    appendHiddenInput(form, 'wpTextbox1', text);
    appendHiddenInput(form, 'wpSummary', summary);
    appendHiddenInput(form, 'wpPreview', '1');

    const csrfToken = mw.user.tokens.get('csrfToken');
    if (csrfToken) {
        appendHiddenInput(form, 'wpEditToken', csrfToken);
    }

    document.body.appendChild(form);
    form.submit();
    form.remove();
}

function appendHiddenInput(form: HTMLFormElement, name: string, value: string): void {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
}

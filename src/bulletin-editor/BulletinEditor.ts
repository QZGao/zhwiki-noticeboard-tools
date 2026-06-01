import { bulletinTitle, summarySuffix } from './constants';
import type { ApiQueryResponse, EditableRange } from './types';
import { valueAsString } from './utils';
import {
    collectActiveText,
    collectArchiveText,
    renderEditorView,
} from './view';
import {
    showDiffResult,
    showEditConflict,
    showPreviewResult,
} from './preview';
import {
    findEditableRange,
    mergeArchiveText,
    mergeMainText,
    parseBulletinRows,
} from './wikitext';

type ApiParams = Record<string, string | number | boolean | string[] | number[] | File | undefined>;

export class BulletinEditor {
    private readonly api = new mw.Api();
    private readonly date = new Morebits.date();
    private readonly archiveTitle = `Wikipedia:公告欄/存檔/${this.date.format('YYYY年')}`;
    private bulletinText = '';
    private basetimestamp = '';
    private curtimestamp = '';
    private editableRange: EditableRange | null = null;
    private $wrapper = $('<div>');

    async open(): Promise<void> {
        $('#firstHeading').text(wgULS('公告栏编辑器', '公告欄編輯器'));
        $('#be-editor').remove();

        this.$wrapper = $('<div>').attr('id', 'be-editor');
        const editorText = valueAsString($('#wpTextbox1').val());
        $('#bodyContent').empty().append(this.$wrapper);

        if (!this.userCanEdit()) {
            this.showPermissionError();
            return;
        }

        try {
            await this.loadBulletinText(editorText);
            this.render();
        } catch (error) {
            console.error('Failed to load bulletin editor content:', error);
            const message = error instanceof Error ? error.message : String(error);
            mw.notify(wgULS('加载内容时发生错误：', '載入內容時發生錯誤：') + message, { type: 'error' });
        }
    }

    private userCanEdit(): boolean {
        const groups = mw.config.get('wgUserGroups') || [];
        return groups.indexOf('autoconfirmed') !== -1;
    }

    private showPermissionError(): void {
        $('#firstHeading').text(wgULS('权限错误', '權限錯誤'));
        document.title = wgULS('权限错误 - 维基百科，自由的百科全书', '權限錯誤 - 維基百科，自由的百科全書');
        this.$wrapper.append(
            $('<div>')
                .addClass('errorbox')
                .append(wgULS('您没有权限使用公告栏编辑器。', '您沒有權限使用公告欄編輯器。')),
        );
    }

    private async loadBulletinText(editorText: string): Promise<void> {
        const params: ApiParams = {
            action: 'query',
            format: 'json',
            prop: 'revisions',
            titles: bulletinTitle,
            rvprop: ['content', 'timestamp'],
            formatversion: '2',
            curtimestamp: true,
        };

        if (
            mw.config.get('wgRevisionId') !== 0
            && mw.config.get('wgRevisionId') !== mw.config.get('wgCurRevisionId')
        ) {
            params.rvstartid = mw.config.get('wgRevisionId');
            this.$wrapper.append(
                $('<div>')
                    .addClass('mw-message-box-warning mw-message-box')
                    .append($('<b>').text('警告：'))
                    .append(wgULS(
                        '您正在编辑的是本页的旧版本。如果您保存它的话，在本版本之后的任何修改都会丢失。',
                        '您正在編輯的是本頁的舊版本。如果您保存它的話，在本版本之後的任何修改都會丟失。',
                    )),
            );
        }

        const data = await this.api.get(params) as ApiQueryResponse;
        const revision = data.query.pages[0].revisions?.[0];
        if (!revision) {
            throw new Error('missing bulletin revision');
        }

        this.basetimestamp = revision.timestamp || '';
        this.curtimestamp = data.curtimestamp || '';
        this.bulletinText = revision.content;

        if (editorText) {
            this.bulletinText = editorText;
            this.$wrapper.append(
                $('<div>')
                    .addClass('mw-message-box-warning mw-message-box')
                    .append($('<b>').text('警告：'))
                    .append(wgULS('已从编辑框加载内容，而非是最新版本内容。', '已從編輯框載入內容，而非是最新版本內容。')),
            );
        }

        const range = findEditableRange(this.bulletinText);
        if (!range) {
            throw new Error(wgULS('无法从文本解析公告位置', '無法從文本解析公告位置'));
        }
        this.editableRange = range;
    }

    private render(): void {
        const range = this.requireEditableRange();
        const rows = parseBulletinRows(range.mainText, Morebits);

        renderEditorView(this.$wrapper, rows, this.archiveTitle, {
            previewPage: () => this.previewPage(),
            diffPage: () => this.diffPage(),
            diffArchive: () => this.diffArchive(),
            savePage: () => this.savePage(),
        });
    }

    private currentBulletinText(): string {
        return mergeMainText(this.bulletinText, this.requireEditableRange(), collectActiveText());
    }

    private currentArchiveText(oldtext: string): string {
        return mergeArchiveText(oldtext, collectArchiveText(), this.date);
    }

    private requireEditableRange(): EditableRange {
        if (!this.editableRange) {
            throw new Error('bulletin text has not been loaded');
        }

        return this.editableRange;
    }

    private previewPage(): void {
        void this.api.post({
            action: 'parse',
            contentmodel: 'wikitext',
            text: this.currentBulletinText(),
            title: bulletinTitle,
            summary: valueAsString($('#be-summary').val()) + summarySuffix,
            prop: 'text',
            formatversion: '2',
        })
            .done((data: any) => {
                showPreviewResult(data.parse.parsedsummary, data.parse.text);
            })
            .fail((error: string, result: unknown) => {
                console.error('Failed to generate bulletin preview:', { error, result });
                mw.notify(wgULS('生成预览时发生错误：', '產生預覽時發生錯誤：') + error, { type: 'error' });
            });
    }

    private diffPage(): void {
        void this.api.post({
            action: 'query',
            prop: 'revisions',
            titles: bulletinTitle,
            rvdifftotext: this.currentBulletinText(),
            formatversion: '2',
        })
            .done((data: ApiQueryResponse) => {
                showDiffResult(data, wgULS('公告栏无变更', '公告欄無變更'));
            })
            .fail((error: string, result: unknown) => {
                console.error('Failed to generate bulletin diff:', { error, result });
                mw.notify(wgULS('生成差异时发生错误：', '產生差異時發生錯誤：') + error, { type: 'error' });
            });
    }

    private diffArchive(): void {
        void this.api.get({
            action: 'query',
            prop: 'revisions',
            rvprop: ['content'],
            titles: this.archiveTitle,
            formatversion: '2',
        })
            .done((data: ApiQueryResponse) => {
                const page = data.query.pages[0];
                const text = page.missing ? '' : page.revisions?.[0]?.content || '';

                void this.api.post({
                    action: 'query',
                    prop: 'revisions',
                    titles: this.archiveTitle,
                    rvdifftotext: this.currentArchiveText(text),
                    formatversion: '2',
                })
                    .done((diffData: ApiQueryResponse) => {
                        showDiffResult(diffData, wgULS('存档页无变更', '存檔頁無變更'));
                    })
                    .fail((error: string, result: unknown) => {
                        console.error('Failed to generate bulletin archive diff:', { error, result });
                        mw.notify(wgULS('生成差异时发生错误：', '產生差異時發生錯誤：') + error, { type: 'error' });
                    });
            })
            .fail((error: string, result: unknown) => {
                console.error('Failed to fetch bulletin archive for diff:', { error, result });
                mw.notify(wgULS('生成差异时发生错误：', '產生差異時發生錯誤：') + error, { type: 'error' });
            });
    }

    private savePage(): void {
        if (!confirm(wgULS('确认发布变更？', '確認發布變更？'))) {
            mw.notify('已取消操作');
            return;
        }

        void this.api.edit(bulletinTitle, () => ({
            text: this.currentBulletinText(),
            summary: valueAsString($('#be-summary').val()) + summarySuffix,
            basetimestamp: this.basetimestamp,
            starttimestamp: this.curtimestamp,
        }))
            .done(() => {
                mw.notify(wgULS('成功保存公告栏', '成功儲存公告欄'));

                if (collectArchiveText() === '') {
                    mw.notify(wgULS('无将存档者，即将重新加载页面...', '無將存檔者，即將重新載入頁面...'));
                    setTimeout(() => location.reload(), 1000);
                    return;
                }

                this.saveArchive();
            })
            .fail((error: string, result: unknown) => {
                console.error('Failed to save bulletin page:', { error, result });
                if (error === 'editconflict') {
                    showEditConflict(this.currentBulletinText(), collectArchiveText());
                    mw.notify(wgULS(
                        '保存公告栏时发生编辑冲突，请从下方复制您的版本并使用传统编辑框解决冲突',
                        '儲存公告欄時發生編輯衝突，請從下方複製您的版本並使用傳統編輯框解決衝突',
                    ), { type: 'error' });
                } else {
                    mw.notify(wgULS('保存公告栏时发生错误：', '儲存公告欄時發生錯誤：') + error, { type: 'error' });
                }
            });
    }

    private saveArchive(): void {
        void this.api.edit(this.archiveTitle, (revision?: { content?: string }) => ({
            text: this.currentArchiveText(revision?.content || ''),
            summary: wgULS('存档', '存檔') + summarySuffix,
        }))
            .done(() => {
                mw.notify(wgULS('成功保存存档页，即将重新加载页面...', '成功儲存存檔頁，即將重新載入頁面...'));
                setTimeout(() => location.reload(), 1000);
            })
            .fail((error: string, result: unknown) => {
                console.error('Failed to save bulletin archive:', { error, result });
                mw.notify(wgULS('保存存档页时发生错误：', '儲存存檔頁時發生錯誤：') + error, { type: 'error' });
            });
    }
}

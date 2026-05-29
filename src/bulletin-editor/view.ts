import { iconAdd, iconArchive, iconMove, bulletinTitle } from './constants';
import { injectStyles } from './styles';
import type { BulletinRow } from './types';
import { valueAsString } from './utils';

export type EditorActions = {
    previewPage(): void;
    diffPage(): void;
    diffArchive(): void;
    savePage(): void;
};

export function renderEditorView(
    $wrapper: JQuery,
    rows: BulletinRow[],
    archiveTitle: string,
    actions: EditorActions,
): void {
    const $tbody = $('<tbody>').attr('id', 'be-active-tbody');

    $wrapper.append(
        $('<table>')
            .attr('id', 'be-active-zone')
            .addClass('wikitable')
            .append(renderTableHeader($tbody))
            .append($tbody),
    );

    renderRows($tbody, rows);
    renderArchiveZone($wrapper, archiveTitle);
    renderControls($wrapper, actions);
    renderPreviewBoxes($wrapper, archiveTitle);
    injectStyles($wrapper);
    enableSorting();
}

export function collectActiveText(): string {
    let newText = '';

    $('.be-row').each((_rowIndex, row) => {
        const $row = $(row);
        const itemsText = $row
            .find('.be-item-main')
            .map((_itemIndex, item) => valueAsString($(item).val()).trim())
            .get()
            .filter((item) => item.length > 0);

        if (itemsText.length === 0) {
            return;
        }

        let tempText = '{{bulletin/item|';
        tempText += valueAsString($row.find('.be-row-type').val()).trim();

        const prefix = valueAsString($row.find('.be-row-prefix').val()).trim();
        const suffix = valueAsString($row.find('.be-row-suffix').val()).trim();

        if (!prefix && !suffix && itemsText.length === 1) {
            tempText += `|${itemsText[0]}`;
        } else {
            if (prefix) {
                tempText += `|prefix=${prefix}`;
            }

            tempText += '\n';
            tempText += itemsText.map((item) => `|${item}\n`).join('');

            if (suffix) {
                tempText += `|suffix=${suffix}`;
            }
        }

        tempText += '}}\n';
        newText += tempText;
    });

    return newText;
}

export function collectArchiveText(): string {
    const itemsText: string[] = [];

    $('#be-archive-zone .be-item').each((_itemIndex, item) => {
        const $item = $(item);
        const main = valueAsString($item.find('.be-item-main').val()).trim();

        if (!main) {
            return;
        }

        let tempText = '{{bulletin/item|';
        tempText += valueAsString($item.find('.be-item-type').val()).trim();
        tempText += '|';
        tempText += valueAsString($item.find('.be-item-prefix').val()).trim();
        tempText += main;
        tempText += valueAsString($item.find('.be-item-suffix').val()).trim();
        tempText += '}}~~~~~';
        itemsText.push(tempText);
    });

    return itemsText.join('\n');
}

function renderTableHeader($tbody: JQuery): JQuery {
    return $('<thead>').append(
        $('<tr>')
            .append(
                $('<th>')
                    .css('width', '30px')
                    .text('類別')
                    .append(
                        $('<img>')
                            .attr({
                                src: iconAdd,
                                title: wgULS('增加一个公告类别', '增加一個公告類別'),
                            })
                            .on('click', () => {
                                const $row = createRow().prependTo($tbody);
                                enableItemSorting($row.find('.be-items'));
                                createItem().appendTo($row.find('.be-items'));
                            }),
                    ),
            )
            .append(
                $('<th>')
                    .css('width', '100%')
                    .text(wgULS('公告内容', '公告內容')),
            ),
    );
}

function renderRows($tbody: JQuery, rows: BulletinRow[]): void {
    rows.forEach((row) => {
        const $row = createRow(row.type, row.prefix, row.suffix).appendTo($tbody);
        const $ul = $row.find('.be-items');
        row.items.forEach((item) => createItem(item).appendTo($ul));
    });
}

function renderArchiveZone($wrapper: JQuery, archiveTitle: string): void {
    const $archiveZone = $('<div>').attr('id', 'be-archive-zone').appendTo($wrapper);
    $archiveZone.append(document.createTextNode(wgULS('存档至', '存檔至')));
    $archiveZone.append(
        $('<a>')
            .attr({
                href: mw.util.getUrl(archiveTitle),
                target: '_blank',
            })
            .text(archiveTitle),
    );
    $archiveZone.append(document.createTextNode(wgULS(
        '（发布变更时会自动合并Prefix、Suffix）',
        '（發布變更時會自動合併Prefix、Suffix）',
    )));
    $archiveZone.append($('<ul>').attr('id', 'be-archiveul').addClass('be-items'));
}

function renderControls($wrapper: JQuery, actions: EditorActions): void {
    $wrapper.append($('<span>').text(wgULS('公告栏编辑摘要：', '公告欄編輯摘要：')));
    $wrapper.append($('<input>').attr('id', 'be-summary'));
    $wrapper.append($('<br>'));

    $('<div>')
        .addClass('be-action-buttons')
        .append(
            createButton('be-preview', wgULS('公告栏预览', '公告欄預覽'), actions.previewPage),
            createButton('be-diff-page', wgULS('公告栏差异', '公告欄差異'), actions.diffPage),
            createButton('be-diff-archive', wgULS('存档差异', '存檔差異'), actions.diffArchive),
            createButton('be-publish', wgULS('发布变更', '發布變更'), actions.savePage, ['primary', 'progressive']),
        )
        .appendTo($wrapper);
}

function createButton(
    id: string,
    label: string,
    onClick: () => void,
    flags?: OO.ui.ButtonWidget.ConfigOptions['flags'],
): JQuery {
    const button = new OO.ui.ButtonWidget({ label, flags });
    button.$element.attr('id', id);
    button.on('click', onClick);
    return button.$element;
}

function renderPreviewBoxes($wrapper: JQuery, archiveTitle: string): void {
    const $conflictBox = $('<div>')
        .attr('id', 'be-conflict-box')
        .addClass('be-preview-boxes')
        .hide()
        .appendTo($wrapper);

    $conflictBox.append(
        $('<span>')
            .attr('id', 'be-conflict-label')
            .text(wgULS(
                '发生了编辑冲突！请从下方复制您的版本并使用传统编辑框来完成您的编辑，或是重新加载公告栏编辑器（您之前的变更将丢失）。',
                '發生了編輯衝突！請從下方複製您的版本並使用傳統編輯框來完成您的編輯，或是重新載入公告欄編輯器（您之前的變更將遺失）。',
            )),
    );
    $conflictBox.append($('<br>'));
    appendEditConflictTextarea($conflictBox, wgULS('公告栏文字', '公告欄文字'), bulletinTitle, 'be-conflict-main', 10);
    appendEditConflictTextarea($conflictBox, wgULS('存档页文字', '存檔頁文字'), archiveTitle, 'be-conflict-archive', 5);

    const $summaryBox = $('<div>')
        .attr('id', 'be-summary-box')
        .addClass('be-preview-boxes')
        .hide()
        .appendTo($wrapper);
    $summaryBox.append($('<span>').text(wgULS('公告栏编辑摘要预览：', '公告欄編輯摘要預覽：')));
    $summaryBox.append($('<span>').attr('id', 'be-summary-body'));

    const $previewBox = $('<div>')
        .attr('id', 'be-preview-box')
        .addClass('be-preview-boxes')
        .hide()
        .appendTo($wrapper);
    $previewBox.append($('<span>').attr('id', 'be-preview-body'));

    const $diffBox = $('<div>')
        .attr('id', 'be-diff-box')
        .addClass('be-preview-boxes')
        .hide()
        .appendTo($wrapper);
    $diffBox.append($('<span>').attr('id', 'be-diff-nochange').hide());
    $diffBox.append($(`
        <table class="diff">
            <colgroup>
                <col class="diff-marker">
                <col class="diff-content">
                <col class="diff-marker">
                <col class="diff-content">
            </colgroup>
            <tbody id="be-diff-body">
            </tbody>
        </table>
    `));
}

function appendEditConflictTextarea(
    $box: JQuery,
    label: string,
    pageTitle: string,
    id: string,
    rows: number,
): void {
    $box.append($('<span>').text(label));
    $box.append(document.createTextNode('（'));
    $box.append(
        $('<a>')
            .attr({
                href: mw.util.getUrl(pageTitle, { action: 'edit' }),
                target: '_blank',
            })
            .text(wgULS('编辑', '編輯')),
    );
    $box.append(document.createTextNode('）'));
    $box.append($('<textarea>').attr({ id, rows }));
}

function createRow(type = '公告', prefix = '', suffix = ''): JQuery {
    const $tr = $('<tr>').addClass('be-row');

    const $type = $('<td>').addClass('be-type-col').appendTo($tr);
    $type.append(
        $('<img>')
            .addClass('be-sortable-row-handle')
            .attr({
                src: iconMove,
                title: wgULS('调整公告类别顺序', '調整公告類別順序'),
            }),
    );
    $type.append($('<br>'));
    $type.append($('<input>').addClass('be-type-text be-row-type').val(type));

    const $items = $('<td>').addClass('be-item-col').appendTo($tr);
    $items.append($('<span>').text('Prefix: '));
    $items.append($('<input>').addClass('be-item-text be-row-prefix').val(prefix));

    $items.append($('<br>'));
    $items.append($('<span>').text('Items: '));
    $items.append(
        $('<img>')
            .attr({
                src: iconAdd,
                title: wgULS('增加一个公告项目', '增加一個公告項目'),
            })
            .on('click', (event) => {
                createItem().prependTo($(event.target).parents('.be-item-col').find('.be-items'));
            }),
    );

    $('<ul>').addClass('be-items').appendTo($items);

    $items.append($('<span>').text('Suffix: '));
    $items.append($('<input>').addClass('be-item-text be-row-suffix').val(suffix));

    return $tr;
}

function createItem(text = ''): JQuery {
    const $li = $('<li>').addClass('be-item');
    $li.append(
        $('<img>')
            .addClass('be-sortable-item-handle')
            .attr({
                src: iconMove,
                title: wgULS('调整公告项目顺序或移动到其他公告类别', '調整公告項目順序或移動到其他公告類別'),
            }),
    );

    $li.append($('<input>').addClass('be-type-text be-item-type'));
    $li.append($('<input>').addClass('be-item-text be-item-prefix'));
    $li.append(
        $('<input>')
            .addClass('be-item-text be-item-main')
            .val(text)
            .attr('placeholder', wgULS('空的项目将在发布变更时自动忽略', '空的項目將在發布變更時自動忽略')),
    );
    $li.append($('<input>').addClass('be-item-text be-item-suffix'));
    $li.append(
        $('<img>')
            .addClass('be-archive-btn')
            .attr({
                src: iconArchive,
                title: wgULS('存档', '存檔'),
            })
            .on('click', moveToArchive),
    );

    return $li;
}

function moveToArchive(event: JQuery.ClickEvent): void {
    const item = $(event.target).parent();
    copyDataFromParent(item, item.parents('.be-row'));
    $('#be-archiveul').append(item);
}

function copyDataFromParent(item: JQuery, row: JQuery): void {
    item.find('.be-item-type').val(row.find('.be-row-type').val() || '');
    item.find('.be-item-prefix').val(row.find('.be-row-prefix').val() || '');
    item.find('.be-item-suffix').val(row.find('.be-row-suffix').val() || '');
}

function enableSorting(): void {
    enableItemSorting($('.be-items'));

    ($('#be-active-tbody') as any).sortable({
        handle: '.be-sortable-row-handle',
    });
}

function enableItemSorting($items: JQuery): void {
    let oldList: JQuery | undefined;
    ($items as any)
        .sortable({
            handle: '.be-sortable-item-handle',
            start: (_event: JQuery.Event, ui: { item: JQuery }) => {
                oldList = ui.item.parent();
                ui.item.addClass('be-moving');
            },
            stop: (_event: JQuery.Event, ui: { item: JQuery }) => {
                if (oldList && $('#be-active-zone').has(oldList[0]).length && $('#be-archive-zone').has(ui.item[0]).length) {
                    copyDataFromParent(ui.item, oldList.parents('.be-row'));
                }
                ui.item.removeClass('be-moving');
            },
            connectWith: '.be-items',
        })
        .disableSelection();
}

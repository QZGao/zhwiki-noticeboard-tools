import { BulletinEditor } from './BulletinEditor';
import { bulletinTitle } from './constants';

let activeEditor: BulletinEditor | null = null;

export function shouldLoadBulletinEditor(): boolean {
    return mw.config.get('wgPageName') === bulletinTitle;
}

export function initBulletinEditor(): void {
    if (!shouldLoadBulletinEditor()) {
        return;
    }

    const link = mw.util.addPortletLink(
        'p-views',
        '#',
        wgULS('可视化编辑', '視覺化編輯'),
        'ca-bulletin-editor',
        wgULS('使用公告栏编辑器编辑此页面', '使用公告欄編輯器編輯此頁面'),
        null,
        '#ca-history',
    );

    $(link)
        .addClass('collapsible')
        .on('click', (event) => {
            event.preventDefault();
            activeEditor = new BulletinEditor();
            void activeEditor.open();
        });
}

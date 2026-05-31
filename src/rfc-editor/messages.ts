let messagesRegistered = false;

export function registerRfcEditorMessages(): void {
    if (messagesRegistered) {
        return;
    }

    mw.messages.set({
        'edit-rfc-button': wgULS('编辑RFC', '編輯RFC'),
        'edit-rfc-button-inprogress': wgULS('正在载入……', '正在載入……'),

        'edit-rfc-window-title': wgULS('编辑征求意见模板', '編輯徵求意見模板'),
        'edit-rfc-window-confirm': wgULS('提交', '提交'),
        'edit-rfc-window-cancel': wgULS('取消', '取消'),

        'edit-rfc-field-topics-label': wgULS('所属议题', '所屬議題'),
        'edit-rfc-field-topics-help': wgULS('本讨论应属于的征求意见主题', '本討論應屬於的徵求意見主題'),

        'edit-rfc-field-reason-label': wgULS('修改征求意见话题的原因', '修改徵求意見話題的原因'),
        'edit-rfc-field-reason-help': wgULS('显示於编辑摘要的额外资讯', '顯示於編輯摘要的額外資訊'),

        'edit-rfc-field-rfcid-label': wgULS('征求意见话题编号', '徵求意見話題編號'),
        'edit-rfc-field-rfcid-help': wgULS('由机器人填写的话题编号', '由機器人填寫的話題編號'),

        'edit-rfc-message-new-rfc': wgULS(
            '此讨论尚未有征求意见模板。点按“提交”后，机器人将在十分钟内将此讨论加入征求意见系统。',
            '此討論尚未有徵求意見模板。點按「提交」後，機器人將會在十分鐘內將此討論加入徵求意見系統。',
        ),
        'edit-rfc-message-no-rfcid': wgULS(
            '此讨论已有征求意见模板，但机器人尚未运行。本话题将在十分钟后自动加入征求意见系统。本表单将修改本讨论串所属于的议题。',
            '此討論已有徵求意見模板，但機器人尚未運行。本話題將在十分鐘後自動加入徵求意見系統。本表單將修改本討論串所屬於的議題。',
        ),
        'edit-rfc-message-has-rfcid': wgULS(
            '此讨论已有征求意见模板，且机器人已经运行。本表单将修改本讨论串所属于的议题，修改将于十分钟内应用。',
            '此討論已有徵求意見模板，且機器人已經運行。本表單將修改本討論串所屬於的議題，修改將於十分鐘內應用。',
        ),
        'edit-rfc-message-dryrun': wgULS(
            '试运行模式已启用，编辑将不会提交。如希望退出试运行模式，请在控制台将$1设为$2。',
            '試運行模式已啓用，編輯將不會提交。如希望退出試運行模式，請在主控臺將$1設爲$2。',
        ),

        'edit-rfc-summary-add-template': wgULS('新增征求意见模板', '新增徵求意見模板'),
        'edit-rfc-summary-edit-template': wgULS('编辑征求意见模板', '編輯徵求意見模板'),
        'edit-rfc-summary-remove-template': wgULS('移除征求意见模板', '移除徵求意見模板'),
        'edit-rfc-summary-advertisement': '// [[User:1F616EMO/EditRFC|EditRFC]]',

        'edit-rfc-notify-succeed': wgULS('征求意见模板已成功更新。', '徵求意見模板已成功更新。'),
        'edit-rfc-notify-removed': wgULS('征求意见模板已成功移除。', '徵求意見模板已成功移除。'),
        'edit-rfc-notify-fail': wgULS('无法更新征求意见模板', '無法更新徵求意見模板'),
        'edit-rfc-notify-unchanged': wgULS('征求意见模板无修订，未应用编辑。', '徵求意見模板無修訂，未應用編輯。'),
        'edit-rfc-notify-dryrun': wgULS('试运行模式：编辑未提交。请在控制台查看详情。', '試運行模式：編輯未提交。請在主控臺查看詳情。'),
        'edit-rfc-fetch-fail': wgULS('无法载入章节资料', '無法載入章節資料'),

        'edit-rfc-topic-bio': wgULS('传记', '傳記'),
        'edit-rfc-topic-econ': wgULS('经济、贸易与公司', '經濟、貿易與公司'),
        'edit-rfc-topic-hist': wgULS('历史与地理', '歷史與地理'),
        'edit-rfc-topic-lang': wgULS('语言及语言学', '語言及語言學'),
        'edit-rfc-topic-sci': wgULS('数学、科学与科技', '數學、科學與科技'),
        'edit-rfc-topic-media': wgULS('媒体、艺术与建筑', '媒體、藝術與建築'),
        'edit-rfc-topic-pol': wgULS('政治、政府与法律', '政治、政府與法律'),
        'edit-rfc-topic-reli': wgULS('宗教与哲学', '宗教與哲學'),
        'edit-rfc-topic-soc': wgULS('社会、体育运动与文化', '社會、體育運動與文化'),
        'edit-rfc-topic-style': wgULS('维基百科格式与命名', '維基百科格式與命名'),
        'edit-rfc-topic-policy': wgULS('维基百科方针与指引', '維基百科方針與指引'),
        'edit-rfc-topic-proj': wgULS('维基专题与协作', '維基專題與協作'),
        'edit-rfc-topic-tech': wgULS('维基百科技术议题与模板', '維基百科技術議題與模板'),
        'edit-rfc-topic-prop': wgULS('维基百科提议', '維基百科提議'),
    });

    messagesRegistered = true;
}

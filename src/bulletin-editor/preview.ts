export function showPreviewResult(parsedSummary: string, parsedText: string): void {
    $('.be-preview-boxes').hide();
    $('#be-summary-box').show();
    $('#be-summary-body').html(parsedSummary);
    $('#be-preview-box').show();
    $('#be-preview-body').html(parsedText);
}

export function showDiffResult(diff: string, noChangeMessage: string): void {
    $('.be-preview-boxes').hide();
    $('#be-diff-box').show();

    if (diff === '') {
        $('#be-diff-nochange').text(noChangeMessage).show();
        $('#be-diff-body').hide();
    } else {
        $('#be-diff-nochange').hide();
        $('#be-diff-body').html(diff).show();
    }
}

export function showEditConflict(mainText: string, archiveText: string): void {
    $('.be-preview-boxes').hide();
    $('#be-conflict-box').show();
    $('#be-conflict-main').val(mainText);
    $('#be-conflict-archive').val(archiveText);
}

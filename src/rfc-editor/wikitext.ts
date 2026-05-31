import { rfcMatchRegex, rfcTopicLabel, skipMatchRegex, summarySuffix } from './constants';
import type { RfcTemplateData } from './types';

export function findRFCInSection(sectionText: string): RfcTemplateData | null {
    const match = sectionText.match(rfcMatchRegex);
    if (!match) {
        return null;
    }

    const topics = match[1]
        ? match[1].slice(1).split('|').map((topic) => topic.trim()).filter(Boolean)
        : [];

    return {
        topics,
        rfcid: match[2] || null,
    };
}

export function constructRFCTemplate(topics: string[], rfcid: string | null): string {
    if (topics.length === 0) {
        return rfcid ? `<span class="anchor" id="rfc_${rfcid}"></span>` : '';
    }

    const topicParams = topics.map((topic) => `|${topic}`).join('');
    const rfcIdParam = rfcid ? `|rfcid=${rfcid}` : '';
    return `{{Rfc${topicParams}${rfcIdParam}}}`;
}

export function addRFCTemplate(content: string, topics: string[], rfcid: string | null): string {
    if (rfcMatchRegex.test(content)) {
        return content.replace(rfcMatchRegex, constructRFCTemplate(topics, rfcid));
    }

    if (topics.length === 0) {
        return content;
    }

    const lines = content.split('\n');
    let insertIndex = 1;

    for (let index = lines.length - 1; index >= 1; index--) {
        if (skipMatchRegex.test(lines[index])) {
            insertIndex = index + 1;
            break;
        }
    }

    lines.splice(insertIndex, 0, constructRFCTemplate(topics, rfcid));

    while (insertIndex + 1 < lines.length && lines[insertIndex + 1].trim() === '') {
        lines.splice(insertIndex + 1, 1);
    }

    return lines.join('\n');
}

export function constructEditSummary(oldTopics: string[], newTopics: string[], reason: string): string {
    const commaSeparator = mw.msg('comma-separator');
    const colonSeparator = mw.msg('colon-separator');
    const semicolonSeparator = mw.msg('semicolon-separator');
    const inParentheses = (text: string) => mw.msg('parentheses', text);

    let summary: string;
    if (newTopics.length === 0 && oldTopics.length > 0) {
        summary = wgULS('移除征求意见模板', '移除徵求意見模板');
    } else if (oldTopics.length === 0) {
        summary = wgULS('新增征求意见模板', '新增徵求意見模板')
            + colonSeparator
            + newTopics.map(rfcTopicLabel).join(commaSeparator);
    } else {
        const addedTopics = newTopics.filter((topic) => !oldTopics.includes(topic));
        const removedTopics = oldTopics.filter((topic) => !newTopics.includes(topic));
        const summaryParts: string[] = [];

        if (addedTopics.length > 0) {
            summaryParts.push(`+${addedTopics.map(rfcTopicLabel).join(commaSeparator)}`);
        }
        if (removedTopics.length > 0) {
            summaryParts.push(`-${removedTopics.map(rfcTopicLabel).join(commaSeparator)}`);
        }

        summary = wgULS('编辑征求意见模板', '編輯徵求意見模板')
            + colonSeparator
            + summaryParts.join(semicolonSeparator);
    }

    const trimmedReason = reason.trim();
    if (trimmedReason) {
        summary += ` ${inParentheses(trimmedReason)}`;
    }

    return summary + summarySuffix;
}

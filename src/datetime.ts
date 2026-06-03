const DAY_MS = 86400000;

export function nowIsoString(date = new Date()): string {
    return date.toISOString();
}

export function addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
}

export function utcDateString(date = new Date()): string {
    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
}

export function utcDateValue(dateString: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return null;
    }

    const [year, month, day] = dateString.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
}

export function daysSinceUtcDate(dateString: string): number | null {
    const start = utcDateValue(dateString);
    if (start === null) {
        return null;
    }

    return Math.floor((utcDateValue(utcDateString())! - start) / DAY_MS);
}

export function daysUntilUtcDate(dateString: string): number | null {
    const end = utcDateValue(dateString);
    if (end === null) {
        return null;
    }

    return Math.ceil((end - utcDateValue(utcDateString())!) / DAY_MS);
}

export function formatChineseUtcTimestamp(date: Date): string {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return [
        `${date.getUTCFullYear()}年`,
        `${date.getUTCMonth() + 1}月`,
        `${date.getUTCDate()}日 `,
        `(${weekdays[date.getUTCDay()]}) `,
        `${String(date.getUTCHours()).padStart(2, '0')}:`,
        `${String(date.getUTCMinutes()).padStart(2, '0')} (UTC)`,
    ].join('');
}

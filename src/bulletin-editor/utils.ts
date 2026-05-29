export function valueAsString(value: string | number | string[] | null | undefined): string {
    if (Array.isArray(value)) {
        return value.join('');
    }

    if (value === null || value === undefined) {
        return '';
    }

    return String(value);
}

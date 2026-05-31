import type { EditRfcGlobal } from './types';

export function getEditRfcGlobal(): EditRfcGlobal {
    const win = window as typeof window & { EditRFC?: EditRfcGlobal };
    win.EditRFC = win.EditRFC || {};
    return win.EditRFC;
}

export function isDryRun(): boolean {
    return Boolean(getEditRfcGlobal().dryrun);
}

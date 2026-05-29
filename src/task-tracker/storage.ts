import { LOCAL_STORAGE_KEY } from './constants';
import { normalizeSnapshot } from './model';
import type { TaskTrackerSnapshot } from './types';

export function loadLocalSnapshot(): TaskTrackerSnapshot | null {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? normalizeSnapshot(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

export function saveLocalSnapshot(snapshot: TaskTrackerSnapshot): boolean {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
        return true;
    } catch {
        return false;
    }
}

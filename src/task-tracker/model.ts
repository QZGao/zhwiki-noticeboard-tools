import { TASK_TRACKER_VERSION } from './constants';
import type { TaskSeed, TaskStage, TaskTrackerSnapshot, TrackedTask } from './types';

const stageValues = new Set<TaskStage>(['proposal', 'publicNotice', 'closed']);

export function createTask(seed: TaskSeed = {}): TrackedTask {
    const task: TrackedTask = {
        id: createId(),
        title: '',
        pageTitle: mw.config.get('wgPageName')?.replace(/_/g, ' ') || '',
        createdAt: today(),
        stage: 'proposal',
        hasRfc: false,
        hasBulletin: false,
        isPublicNotice: false,
        publicNoticeStart: '',
        publicNoticeEnd: '',
        isArchived: false,
        notes: '',
    };

    return {
        ...task,
        ...seed,
    };
}

export function createSnapshot(tasks: TrackedTask[], updatedAt = now()): TaskTrackerSnapshot {
    return {
        version: TASK_TRACKER_VERSION,
        updatedAt,
        tasks: cloneTasks(tasks),
    };
}

export function normalizeSnapshot(value: unknown): TaskTrackerSnapshot | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const candidate = value as Partial<TaskTrackerSnapshot>;
    if (!Array.isArray(candidate.tasks)) {
        return null;
    }

    return {
        version: TASK_TRACKER_VERSION,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : now(),
        tasks: candidate.tasks.map(normalizeTask),
    };
}

export function cloneTasks(tasks: TrackedTask[]): TrackedTask[] {
    return tasks.map((task) => ({ ...task }));
}

export function compareTimestamps(left?: string, right?: string): number {
    return timestampValue(left) - timestampValue(right);
}

export function now(): string {
    return new Date().toISOString();
}

export function today(): string {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function daysSince(dateString: string): number | null {
    const start = dateOnlyValue(dateString);
    if (start === null) {
        return null;
    }

    return Math.floor((dateOnlyValue(today())! - start) / 86400000);
}

export function daysUntil(dateString: string): number | null {
    const end = dateOnlyValue(dateString);
    if (end === null) {
        return null;
    }

    return Math.ceil((end - dateOnlyValue(today())!) / 86400000);
}

function normalizeTask(task: Partial<TrackedTask>): TrackedTask {
    const normalizedStage = stageValues.has(task.stage as TaskStage) ? task.stage as TaskStage : 'proposal';

    return {
        id: typeof task.id === 'string' && task.id ? task.id : createId(),
        title: typeof task.title === 'string' ? task.title : '',
        pageTitle: typeof task.pageTitle === 'string' ? task.pageTitle : '',
        createdAt: typeof task.createdAt === 'string' ? task.createdAt : today(),
        stage: normalizedStage,
        hasRfc: Boolean(task.hasRfc),
        hasBulletin: Boolean(task.hasBulletin),
        isPublicNotice: Boolean(task.isPublicNotice),
        publicNoticeStart: typeof task.publicNoticeStart === 'string' ? task.publicNoticeStart : '',
        publicNoticeEnd: typeof task.publicNoticeEnd === 'string' ? task.publicNoticeEnd : '',
        isArchived: Boolean(task.isArchived),
        notes: typeof task.notes === 'string' ? task.notes : '',
    };
}

function createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function timestampValue(value?: string): number {
    if (!value) {
        return 0;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function dateOnlyValue(dateString: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return null;
    }

    const [year, month, day] = dateString.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
}

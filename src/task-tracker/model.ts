import { TASK_TRACKER_VERSION } from './constants';
import type { TaskSeed, TaskStage, TaskTrackerSnapshot, TrackedTask } from './types';
import { daysUntilUtcDate, nowIsoString, utcDateString } from '../datetime';

const stageValues = new Set<TaskStage>(['proposal', 'publicNotice', 'closed']);

export function createTask(seed: TaskSeed = {}): TrackedTask {
    const task: TrackedTask = {
        id: createId(),
        title: '',
        pageTitle: mw.config.get('wgPageName')?.replace(/_/g, ' ') || '',
        createdAt: utcDateString(),
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

export function createSnapshot(tasks: TrackedTask[], updatedAt = nowIsoString()): TaskTrackerSnapshot {
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
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : nowIsoString(),
        tasks: candidate.tasks.map(normalizeTask),
    };
}

export function cloneTasks(tasks: TrackedTask[]): TrackedTask[] {
    return tasks.map((task) => ({ ...task }));
}

export function compareTimestamps(left?: string, right?: string): number {
    return timestampValue(left) - timestampValue(right);
}

export function hasPublicNoticeEnded(task: TrackedTask): boolean {
    const days = daysUntilUtcDate(task.publicNoticeEnd);
    return days !== null && days <= 0;
}

function normalizeTask(task: Partial<TrackedTask>): TrackedTask {
    const normalizedStage = stageValues.has(task.stage as TaskStage) ? task.stage as TaskStage : 'proposal';

    return {
        id: typeof task.id === 'string' && task.id ? task.id : createId(),
        title: typeof task.title === 'string' ? task.title : '',
        pageTitle: typeof task.pageTitle === 'string' ? task.pageTitle : '',
        createdAt: typeof task.createdAt === 'string' ? task.createdAt : utcDateString(),
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

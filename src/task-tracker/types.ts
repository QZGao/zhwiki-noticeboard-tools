export type TaskStage = 'proposal' | 'publicNotice' | 'closed';

export type TrackedTask = {
    id: string;
    title: string;
    pageTitle: string;
    createdAt: string;
    stage: TaskStage;
    hasRfc: boolean;
    hasBulletin: boolean;
    isPublicNotice: boolean;
    publicNoticeStart: string;
    publicNoticeEnd: string;
    isArchived: boolean;
    notes: string;
};

export type TaskSeed = Partial<Omit<TrackedTask, 'id'>>;

export type TaskTrackerSnapshot = {
    version: 1;
    updatedAt: string;
    tasks: TrackedTask[];
};

export type NoticeboardToolsConfig = {
    version?: number;
    taskTracker?: TaskTrackerSnapshot;
    [key: string]: unknown;
};

export type RemoteConfig = {
    exists: boolean;
    title: string;
    config: NoticeboardToolsConfig;
    basetimestamp?: string;
    curtimestamp: string;
};

export type WikiSaveResult =
    | {
        ok: true;
        snapshot: TaskTrackerSnapshot;
    }
    | {
        ok: false;
        reason: 'remote-newer';
        remoteSnapshot: TaskTrackerSnapshot;
    };

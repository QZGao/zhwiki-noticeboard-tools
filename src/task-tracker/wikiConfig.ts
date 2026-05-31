import { CONFIG_VERSION, getConfigPageTitle, summarySuffix } from './constants';
import { compareTimestamps, normalizeSnapshot } from './model';
import type {
    NoticeboardToolsConfig,
    RemoteConfig,
    TaskTrackerSnapshot,
    WikiSaveResult,
} from './types';

type QueryResponse = {
    curtimestamp: string;
    query: {
        pages: Array<{
            missing?: boolean;
            revisions?: Array<{
                content?: string;
                slots?: {
                    main?: {
                        content?: string;
                        '*': string;
                    };
                };
                timestamp: string;
            }>;
        }>;
    };
};

type ApiParams = Record<string, string | number | boolean | string[] | number[] | File | undefined>;

export class WikiConfigClient {
    private readonly api = new mw.Api();
    readonly title = getConfigPageTitle();

    canSave(): boolean {
        return Boolean(this.title);
    }

    async load(): Promise<RemoteConfig | null> {
        if (!this.title) {
            return null;
        }

        const data = await this.api.get({
            action: 'query',
            prop: 'revisions',
            rvprop: ['content', 'timestamp'],
            rvslots: 'main',
            titles: this.title,
            curtimestamp: true,
            formatversion: '2',
        }) as QueryResponse;

        const page = data.query.pages[0];
        if (!page || page.missing) {
            return {
                exists: false,
                title: this.title,
                config: {},
                curtimestamp: data.curtimestamp,
            };
        }

        const revision = page.revisions?.[0];
        if (!revision) {
            throw new Error('missing config revision');
        }

        return {
            exists: true,
            title: this.title,
            config: parseConfig(revisionContent(revision)),
            basetimestamp: revision.timestamp,
            curtimestamp: data.curtimestamp,
        };
    }

    async save(snapshot: TaskTrackerSnapshot): Promise<WikiSaveResult> {
        const remote = await this.load();
        if (!remote) {
            throw new Error('not logged in');
        }

        const remoteSnapshot = normalizeSnapshot(remote.config.taskTracker);
        if (remoteSnapshot && compareTimestamps(remoteSnapshot.updatedAt, snapshot.updatedAt) > 0) {
            return {
                ok: false,
                reason: 'remote-newer',
                remoteSnapshot,
            };
        }

        const nextConfig: NoticeboardToolsConfig = {
            ...remote.config,
            version: CONFIG_VERSION,
            taskTracker: snapshot,
        };

        const params: ApiParams = {
            action: 'edit',
            title: remote.title,
            text: `${JSON.stringify(nextConfig, null, 2)}\n`,
            summary: '更新NoticeboardTools task tracker config' + summarySuffix,
            contentmodel: 'json',
            starttimestamp: remote.curtimestamp,
            watchlist: 'nochange',
            formatversion: '2',
        };

        if (remote.exists) {
            params.basetimestamp = remote.basetimestamp;
        } else {
            params.createonly = true;
        }

        await this.api.postWithToken('csrf', params);

        return {
            ok: true,
            snapshot,
        };
    }
}

function revisionContent(revision: QueryResponse['query']['pages'][number]['revisions'][number]): string {
    return revision.content ?? revision.slots?.main?.content ?? revision.slots?.main?.['*'] ?? '';
}

function parseConfig(content: string): NoticeboardToolsConfig {
    if (!content.trim()) {
        return {};
    }

    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('config page must contain a JSON object');
    }

    return parsed as NoticeboardToolsConfig;
}

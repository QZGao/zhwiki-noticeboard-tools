export type ApiParams = Record<string, string | number | boolean | string[] | number[] | File | undefined>;

export type ApiRevision = {
    content?: string;
    timestamp?: string;
    revid?: number;
    diff?: {
        body?: string;
    };
    slots?: {
        main?: {
            content?: string;
            '*': string;
        };
    };
};

export function createLazyApi(): () => any {
    let api: any = null;

    return () => {
        if (!api) {
            api = new mw.Api();
        }

        return api;
    };
}

export function revisionContent(revision: ApiRevision): string {
    return revision.content ?? revision.slots?.main?.content ?? revision.slots?.main?.['*'] ?? '';
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function apiRequest<T>(api: any, method: 'get' | 'post', params: ApiParams): Promise<T> {
    return new Promise((resolve, reject) => {
        api[method](params)
            .done((data: T) => resolve(data))
            .fail((code: unknown, result: unknown) => {
                reject(new MediaWikiApiError(method, code, result, params));
            });
    });
}

export function apiPostWithToken(api: any, params: ApiParams, tokenType = 'csrf'): Promise<unknown> {
    return new Promise((resolve, reject) => {
        api.postWithToken(tokenType, params)
            .done((data: unknown) => resolve(data))
            .fail((code: unknown, result: unknown) => {
                reject(new MediaWikiApiError('postWithToken', code, result, params));
            });
    });
}

export class MediaWikiApiError extends Error {
    readonly code: unknown;
    readonly result: unknown;
    readonly params: ApiParams;

    constructor(method: string, code: unknown, result: unknown, params: ApiParams) {
        super(apiErrorMessage(method, code, result));
        this.name = 'MediaWikiApiError';
        this.code = code;
        this.result = result;
        this.params = params;
    }
}

function apiErrorMessage(method: string, code: unknown, result: unknown): string {
    const info = apiErrorInfo(result);
    const codeText = String(code || 'unknown');
    return info
        ? `MediaWiki API ${method} failed (${codeText}): ${info}`
        : `MediaWiki API ${method} failed (${codeText})`;
}

function apiErrorInfo(result: unknown): string {
    if (!result || typeof result !== 'object') {
        return '';
    }

    const error = (result as { error?: { info?: unknown } }).error;
    return typeof error?.info === 'string' ? error.info : '';
}

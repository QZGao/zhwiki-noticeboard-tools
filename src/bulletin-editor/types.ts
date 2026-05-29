export type ApiQueryPage = {
    missing?: boolean;
    revisions?: Array<{
        content: string;
        timestamp?: string;
        diff?: {
            body: string;
        };
    }>;
};

export type ApiQueryResponse = {
    curtimestamp?: string;
    query: {
        pages: ApiQueryPage[];
    };
};

export type ParsedTemplate = {
    parameters: Record<string | number, string>;
};

export type BulletinRow = {
    type?: string;
    prefix?: string;
    suffix?: string;
    items: string[];
};

export type EditableRange = {
    start: number;
    end: number;
    mainText: string;
};

export type RfcTemplateData = {
    topics: string[];
    rfcid: string | null;
};

export type RfcSectionAnalysis = {
    content: string;
    revid: number;
    topics: string[];
    rfcid: string | null;
};

export type RfcDialogData = RfcSectionAnalysis & {
    pagetitle: string;
    section: string | null;
};

export type EditRfcGlobal = {
    dryrun?: boolean;
    editRFCDialog?: unknown;
    editRFCDialogInstance?: unknown;
    openEditRFCDialog?: (data: RfcDialogData) => Promise<void> | void;
    fetchAndOpenDialog?: (title: string, section: string | null) => Promise<void>;
};

export type EditStatus = {
    success: true;
    response: unknown;
} | {
    success: false;
    error: unknown;
};

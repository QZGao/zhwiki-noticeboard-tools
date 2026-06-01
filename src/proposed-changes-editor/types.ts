export type SectionId = string | number;

export type ProposedChangesPlacement =
    | {
        type: 'append-section-end';
        section: SectionId;
        separator?: string;
    }
    | {
        type: 'append-section-start';
        section: SectionId;
        separator?: string;
    }
    | {
        type: 'manual';
        section?: SectionId | null;
        buildSectionText(
            existingSectionWikitext: string,
            proposedChangesWikitext: string,
        ): string | Promise<string>;
    };

export type ProposedChangesEditorOptions = {
    pageTitle: string;
    placement: ProposedChangesPlacement;
    initialWikitext?: string;
    dialogTitle?: string;
    editSummary?: string;
    onSaved?(data: ProposedChangesSavedData): void | Promise<void>;
};

export type ProposedChangesSavedData = {
    pageTitle: string;
    section: string | null;
    proposedWikitext: string;
    placedWikitext: string;
};

export type CodeMirrorRequire = (moduleName: string) => unknown;

export type CodeMirrorResource = {
    require: CodeMirrorRequire;
    codeMirrorModule: string;
    modeModule: string;
};

export type ProposedChangesEditorResources = {
    loadCodeMirror(): Promise<CodeMirrorResource>;
};

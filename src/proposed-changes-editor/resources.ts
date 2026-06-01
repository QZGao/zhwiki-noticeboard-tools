import type { CodeMirrorResource, ProposedChangesEditorResources } from './types';

let resources: ProposedChangesEditorResources | null = null;

export function configureProposedChangesEditor(resourcesConfig: ProposedChangesEditorResources): void {
    resources = resourcesConfig;
}

export async function loadCodeMirrorResource(): Promise<CodeMirrorResource> {
    if (!resources) {
        throw new Error('proposed changes editor resources have not been configured');
    }

    return resources.loadCodeMirror();
}

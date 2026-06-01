import { loadCodeMirrorResource } from './resources';

type CodeMirrorLike = {
    initialize(extensions?: unknown): void;
    view?: {
        state?: {
            doc?: {
                toString(): string;
            };
        };
    };
    destroy?(): void;
};

type CodeMirrorConstructor = new (textarea: HTMLTextAreaElement, mode: unknown) => CodeMirrorLike;

export type CodeMirrorBinding = {
    cm: CodeMirrorLike;
    textarea: HTMLTextAreaElement;
    onInput(): void;
};

export async function initializeCodeMirror(
    textarea: HTMLTextAreaElement,
    onChange: (value: string) => void,
): Promise<CodeMirrorBinding | null> {
    try {
        const resource = await loadCodeMirrorResource();
        const CodeMirror = resource.require(resource.codeMirrorModule) as CodeMirrorConstructor;
        const modeModule = resource.require(resource.modeModule) as { mediawiki?: () => unknown };
        const mode = typeof modeModule.mediawiki === 'function' ? modeModule.mediawiki() : null;
        if (!CodeMirror || !mode) {
            return null;
        }

        const cm = new CodeMirror(textarea, mode);
        cm.initialize();

        const binding: CodeMirrorBinding = {
            cm,
            textarea,
            onInput: () => onChange(readCodeMirrorText(binding)),
        };
        textarea.addEventListener('input', binding.onInput);
        return binding;
    } catch (error) {
        console.warn('Failed to initialize CodeMirror for proposed changes editor:', error);
        return null;
    }
}

export function readCodeMirrorText(binding: CodeMirrorBinding): string {
    return binding.cm.view?.state?.doc?.toString() ?? binding.textarea.value;
}

export function destroyCodeMirror(binding: CodeMirrorBinding | null): void {
    if (!binding) {
        return;
    }

    binding.textarea.removeEventListener('input', binding.onInput);
    try {
        binding.cm.destroy?.();
    } catch (error) {
        console.warn('Failed to destroy CodeMirror for proposed changes editor:', error);
    }
}

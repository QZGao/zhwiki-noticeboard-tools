type MwApp = {
    component(name: string, component: unknown): MwApp;
    mount(container: Element): unknown;
};

type VueModule = {
    createMwApp(app: object): MwApp;
};

type CodexModule = Record<string, unknown>;

type VueCompatOptions = {
    compatConfig: {
        MODE: 3;
    };
    compilerOptions: {
        whitespace: 'condense';
    };
};

export function vueCompatOptions(): VueCompatOptions {
    return {
        compatConfig: {
            MODE: 3,
        },
        compilerOptions: {
            whitespace: 'condense',
        },
    };
}

export function mountCodexApp<T>(app: object, container: Element, components: readonly string[]): T {
    const { createMwApp } = mw.loader.require('vue') as VueModule;
    const codex = mw.loader.require('@wikimedia/codex') as CodexModule;
    const mwApp = createMwApp(app);

    components.forEach((componentName) => {
        mwApp.component(componentName, codex[componentName]);
    });

    return mwApp.mount(container) as T;
}

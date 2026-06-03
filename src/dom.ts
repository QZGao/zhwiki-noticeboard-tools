export function getOrCreateElement(id: string): HTMLElement {
    let element = document.getElementById(id);
    if (!element) {
        element = document.createElement('div');
        element.id = id;
        document.body.appendChild(element);
    }

    return element;
}

export function injectStyle(styleId: string, css: string): void {
    if (document.getElementById(styleId)) {
        return;
    }

    $('<style>')
        .attr('id', styleId)
        .text(css)
        .appendTo(document.head);
}

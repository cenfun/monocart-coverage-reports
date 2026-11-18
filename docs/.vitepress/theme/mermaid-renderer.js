import mermaid from 'mermaid';

let nextId = 0;
let pending = Promise.resolve();

// Mermaid configuration is global. Serialize initialization and rendering so
// diagrams and theme changes cannot overwrite one another's configuration.
export const renderDiagram = (graph, dark) => {
    const result = pending.then(() => {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            suppressErrorRendering: true,
            fontFamily: 'var(--vp-font-family-base)',
            theme: dark ? 'dark' : 'default',
            flowchart: {
                htmlLabels: false,
                useMaxWidth: true
            }
        });
        const id = `mcr-diagram-${nextId++}`;
        return mermaid.render(id, graph);
    });
    // One invalid graph must not block later diagrams.
    pending = result.catch(() => null);
    return result;
};

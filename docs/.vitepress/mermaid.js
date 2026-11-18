// Keep Markdown rendering lightweight; the client loads Mermaid only on pages
// containing diagrams. No graph source is executed during SSR.
export const mermaidMarkdown = (md) => {
    const fence = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, index, ... args) => {
        const token = tokens[index];
        if (['mermaid', 'mmd'].includes(token.info.trim())) {
            const graph = md.utils.escapeHtml(encodeURIComponent(token.content));
            return `<McrMermaid class="mcr-mermaid" graph="${graph}" />`;
        }
        return fence(tokens, index, ... args);
    };
};

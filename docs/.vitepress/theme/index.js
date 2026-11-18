import DefaultTheme from 'vitepress/theme';
import HomeLayout from './HomeLayout.vue';
import LazyMermaid from './LazyMermaid.vue';
import './style.css';

export default {
    extends: DefaultTheme,
    Layout: HomeLayout,
    enhanceApp({ app }) {
        app.component('McrMermaid', LazyMermaid);
    }
};

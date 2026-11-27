import DefaultTheme from 'vitepress/theme';
import { setIcons } from 'vine-ui';
import decodeIcons from '../../../src/app/core/icons.js';
import HomeLayout from './HomeLayout.vue';
import LazyMermaid from './LazyMermaid.vue';
import './style.css';
import './home.css';

const iconModules = import.meta.glob('../icons/*.svg', {
    eager: true,
    import: 'default',
    query: '?raw'
});
setIcons(decodeIcons(iconModules));

export default {
    extends: DefaultTheme,
    Layout: HomeLayout,
    enhanceApp({ app }) {
        app.component('McrMermaid', LazyMermaid);
    }
};

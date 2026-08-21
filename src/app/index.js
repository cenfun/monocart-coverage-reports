import { createApp } from 'vue';
import { setIcons } from 'vine-ui';
import App from './app.vue';
import decodeIcons from './core/icons.js';

const iconModules = import.meta.glob('./images/icons/**/*.svg', {
    eager: true,
    import: 'default',
    query: '?raw'
});
setIcons(decodeIcons(iconModules));

const app = createApp(App);
app.mount('body');

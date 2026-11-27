const hash = {

    get: function(key) {
        let data = {};
        const h = location.hash.slice(1);
        if (h) {
            const usp = new URLSearchParams(h);
            data = Object.fromEntries(usp);
        }
        if (key) {
            return data[key];
        }
        return data;
    },

    set: function(key, value) {
        if (!key) {
            return;
        }
        let obj = key;
        if (arguments.length === 2) {
            obj = {};
            obj[key] = value;
        }
        const data = hash.get();
        Object.keys(obj).forEach((k) => {
            data[k] = obj[k];
        });
        const usp = new URLSearchParams(data);
        location.hash = usp.toString();
    },

    remove: function(key) {
        if (!location.hash) {
            return;
        }

        if (key) {
            const keys = Array.isArray(key) ? key : [key];
            const params = new URLSearchParams(location.hash.slice(1));
            if (!keys.some((item) => params.has(item))) {
                return;
            }
            keys.forEach((item) => params.delete(item));
            const fragment = params.toString();
            if (fragment) {
                location.hash = fragment;
                return;
            }
        }

        // Navigating to an empty fragment can scroll an iframe and its parent
        // to reveal the report's top. Keep the history entry without navigating.
        const url = new URL(location.href);
        url.hash = '';
        history.pushState(history.state, '', url);
    }
};


export default hash;

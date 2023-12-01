import { Util as GridUtil } from 'turbogrid';
import ShareUtil from '../../../../lib/platform/share.js';

const Util = {
    ... GridUtil,
    ... ShareUtil,

    isTouchDevice: function() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    },

    getSourceName: (sourcePath = '') => {
        const pathList = sourcePath.split('/');
        const lastName = pathList.pop();
        const dir = pathList.pop();

        // with extname
        const index = lastName.lastIndexOf('.');
        if (index !== -1) {
            const ext = lastName.slice(index + 1);
            const reg = /^[a-z0-9]+$/;
            if (reg.test(ext)) {
                return lastName;
            }
        }

        // with parent dir
        if (dir) {
            return `${dir}/${lastName}`;
        }
        return lastName;
    }
};

export default Util;

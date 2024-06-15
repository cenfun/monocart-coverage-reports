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
    },

    CF: function(v) {
        const base = 1000;
        const units = ['', 'K', 'M', 'B', 'T', 'P'];
        const space = '';
        const postfix = '';
        return Util.KF(v, base, units, space, postfix);
    },

    KF: function(v, base, units, space, postfix) {
        v = Util.toNum(v, true);
        if (v <= 0) {
            return `0${space}${postfix}`;
        }
        for (let i = 0, l = units.length; i < l; i++) {
            const min = Math.pow(base, i);
            const max = Math.pow(base, i + 1);
            if (v > min && v <= max) {
                const unit = units[i];
                if (unit) {
                    const n = v / min;
                    const nl = n.toString().split('.')[0].length;
                    const fl = Math.max(3 - nl, 1);
                    v = n.toFixed(fl);
                }
                v = v + space + unit + postfix;
                break;
            }
        }
        return v;
    }
};

export default Util;

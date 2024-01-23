
const ts = require('./typescript.ts');

const method = (v) => {

};

module.exports = (v) => {
    console.log('this is component');
    ts();

    if (v === 1) {
        method(v);
    }

    if (v === 2) {
        method(v);
    }

    if (v === 3) {
        method(v);
    }

};

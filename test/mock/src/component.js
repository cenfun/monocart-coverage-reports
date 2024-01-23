
const ts = require('./typescript.ts');

module.exports = (v) => {
    console.log('this is component');
    ts();

    if (v) {
        // covered and uncovered
        console.log(v);
    }

};

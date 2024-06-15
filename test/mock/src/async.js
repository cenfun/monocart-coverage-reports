const f = false;
const t = true;
console.info('i am a line of code');

function apple(awesome) {
    if (f || t) {
        console.info('what');
    }
    if (t || f) {
        console.log('hey');
    }
}

// eslint-disable-next-line no-unused-vars
function missed() {

}

// eslint-disable-next-line no-unused-vars
function missed2() {

}

apple();
apple();
apple();


const try_catch_await = async () => {
    const list = [new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
    }), new Promise((resolve, reject) => {
        setTimeout(reject, 100);
    })];

    try {
        for (const p of list) {
            console.log(await p);
        }
        console.log('uncovered');
    } catch (err) {
        console.log(err);
    }

    try {
        for await (const p of list) {
            console.log(p);
        }
    } catch (err) {
        console.log(err);
    }
};

try_catch_await();

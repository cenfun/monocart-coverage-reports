const statement = () => {

    let n = 0;
    for (;n < 3; n++) {
        console.log(n);
    }

    // istanbul: 'for init' count as two statements
    for (let i = 0, j = 1; i < 3; i++) {
        console.log(i + j);
    }

    const arr = [1, 2, 3];
    for (const item in arr) {
        console.log(item);
    }

    let it = 0;
    for (it of arr) {
        console.log(it);
    }

    let j = 0;
    while (j < 3) {
        console.log(j);
        j++;
    }
};

module.exports = {
    statement
};

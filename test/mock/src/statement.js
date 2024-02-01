
let n = 0;
for (;n < 3; n++) {
    console.log(n);
}

// istanbul: for init count as two statements
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

const uncoveredFunction = () => {
    const list = [1, 2, 3, 4, 5];
    list.forEach((v) => {
        console.log(v);
    });
};

function coveredFunction() {
    for (let i = 0; i < 3; i++) {
        if (i > 1) {
            console.log(i);
        } else if (i > 100) {
            uncoveredFunction();
        }
    }
}

const statement = () => {
    coveredFunction();
};

module.exports = {
    statement
};

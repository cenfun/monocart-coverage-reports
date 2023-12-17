var str: string = "hello world";

// point type
type Point = {
    x: number,
    y: number
}

var p: Point = {
    x: 1,
    y: 2
}

var fun = (v: Point) => {
    console.log(v);
}

fun(p);

var main = (p: Point, v: string) => {
    /* 
        block comment
    */

    console.log(p, v);

}

module.exports = main;
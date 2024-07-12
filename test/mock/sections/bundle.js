//@ui5-bundle sap/ui/demo/todo/bundle.js
//@ui5-bundle-raw-include sap/ui/demo/todo/comments.js
"use strict";

/* eslint-disable no-trailing-spaces,line-comment-position,no-inline-comments,indent,no-multi-spaces,no-multiple-empty-lines */
// LineComment

console.log('some"//"\\\'thing\\'); // comment /*  

// comment /* ---
console.log('some//thing/*'); /*  
                              ddd
                              */
console.log('some/*/thing');
//
console.log(`
        '/*
            "//"
        */'
     `);

/**
    * BlockComment
    
 *
       
        */
console.log('some/*/thing');
console.log('some//thing'); // end of line

/*
    connected
*/
console.log('some*//thing'); /*
                             cross line
                             */

console.log('some*//thing'); /*
                             cross line
                             */

console.log('some*//thing'); /* inline */
console.log('some*//thing');

/*
 multiple line
//

 */

/**/
console.log('some*//thing'); /*
                             console.log('some//*thing')
                             */
//@ui5-bundle-raw-include sap/ui/demo/todo/statement.js
"use strict";

const statement = () => {
  let n = 0;
  for (; n < 3; n++) {
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
statement();
//@ui5-bundle-raw-include sap/ui/demo/todo/statics.js
"use strict";

class ClassWithStaticInitializationBlock {
  static staticProperty1 = 'Property 1';
  static staticProperty2;
  static #_ = (() => {
    const funInStatic = v => {
      if (v) {
        return v;
      }
      return 'function in static';
    };
    if (this.staticProperty2) {
      this.staticProperty2 = 'Property 2';
    } else {
      this.staticProperty2 = 'Property 1';
      funInStatic(this.staticProperty1);
    }
  })();
  static staticProperty3;
  constructor() {
    this.prop = 1;
  }
  myMethod() {
    this.prop = 2;
  }
}
new ClassWithStaticInitializationBlock();
//@ui5-bundle-raw-include sap/ui/demo/todo/closures.js
"use strict";

function functionDefineAfterReturn(v) {
  if (!v) {
    functionAfterReturn();
    return functionAfterReturn();
  }
  missed1();
  missed2();
  return v;

  // comments
  function missed1() {
    console.log('missed1');
  }
  function functionAfterReturn(a) {
    if (a) {
      return a;
    }
    covered();
    [1, 2].forEach(n => {
      // sub function
    });
    console.log('should be covered here');
    return 'Hello';
  }
  function missed2() {
    console.log('missed2');
  }
  function covered() {
    console.log('covered');
  }
}
functionDefineAfterReturn();
//@ui5-bundle-raw-include sap/ui/demo/todo/b.js
"use strict";

function B() {
  console.log('B called');
}
//@ui5-bundle-raw-include sap/ui/demo/todo/async.js
"use strict";

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
function missed() {}

// eslint-disable-next-line no-unused-vars
function missed2() {}
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
//@ui5-bundle-raw-include sap/ui/demo/todo/a.js
"use strict";

function A() {
  console.log('A called');
}
//# sourceMappingURL=bundle.js.map

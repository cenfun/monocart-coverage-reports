// test native node:coverage ignore

let anAlwaysFalseCondition;

/* node:coverage disable */
if (anAlwaysFalseCondition) {
  // Code in this branch will never be executed, but the lines are ignored for
  // coverage purposes. All lines following the 'disable' comment are ignored
  // until a corresponding 'enable' comment is encountered.
  console.log('this is never executed');
}
/* node:coverage enable */ 
let not_ignored;

/* node:coverage ignore next */
if (anAlwaysFalseCondition) { console.log('this is never executed'); }
let not_ignored1;

/* node:coverage ignore next 3 */
if (anAlwaysFalseCondition) {
  console.log('this is never executed');
} 
let not_ignored2;

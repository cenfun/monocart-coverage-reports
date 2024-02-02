const a = 99
const b = true ? 1 : 2
if (a + b) {
  console.log('covered')
/* v8 ignore start */
} else {
  console.log('uncovered')
}
/* v8 ignore stop */

/* v8 ignore start */ 'ignore me'
function notExecuted () {

}
/* v8 ignore stop */

if (a + b) {
  console.log('covered')
} else { /* v8 ignore start */
  console.log('uncovered')
}
// have to stop if build in dist will ignore all others
/* v8 ignore stop */
const a = 99
const b = true ? 1 : 2
if (a + b) {
  console.info('covered')
/* v8 ignore start */
} else {
  console.info('uncovered')
}
/* v8 ignore stop */

/* v8 ignore start */ 'ignore me'
function notExecuted () {

}
/* v8 ignore stop */

if (a + b) {
  console.info('covered')
} else { /* v8 ignore start */
  console.info('uncovered')
}

const a = 99
const b = true ? 1 /* v8 ignore next */ : 2
if (a + b) {
  console.log('covered')
/* v8 ignore next 3 */
} else {
  console.log('uncovered')
}

/* v8 ignore next */
if (a < b) console.log('uncovered')

/* v8 ignore next 3 */
function notExecuted () {

}

if (a + b) {
  console.log('covered')
} else { /* c8 ignore next */
  console.log('uncovered')
}

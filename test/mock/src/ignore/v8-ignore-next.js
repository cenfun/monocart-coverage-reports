const a = 99
const b = true ? 1 /* v8 ignore next */ : 2
if (a + b) {
  console.info('covered')
/* v8 ignore next 3 */
} else {
  console.info('uncovered')
}

/* v8 ignore next */
if (a < b) console.info('uncovered')

/* v8 ignore next 3 */
function notExecuted () {

}

if (a + b) {
  console.info('covered')
} else { /* c8 ignore next */
  console.info('uncovered')
}

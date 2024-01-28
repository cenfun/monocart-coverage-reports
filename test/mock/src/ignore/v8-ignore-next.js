const a = 99
const b = true ? 1 /* v8 ignore next */ : 2
if (true) {
  console.info('covered')
/* v8 ignore next 3 */
} else {
  console.info('uncovered')
}

/* v8 ignore next */
if (false) console.info('uncovered')

/* v8 ignore next 3 */
function notExecuted () {

}

if (true) {
  console.info('covered')
} else { /* c8 ignore next */
  console.info('uncovered')
}

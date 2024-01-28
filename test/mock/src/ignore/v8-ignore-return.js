function fn() {
  return true;
      /* v8 ignore next */
  console.log('never runs');
}

fn();
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("coverage-v8", [], factory);
	else if(typeof exports === 'object')
		exports["coverage-v8"] = factory();
	else
		root["coverage-v8"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!***************************!*\
  !*** ./mock/src/index.js ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bar: () => (/* binding */ bar),
/* harmony export */   foo: () => (/* binding */ foo),
/* harmony export */   start: () => (/* binding */ start)
/* harmony export */ });
function foo(argument) {
  console.log('this is foo');
  if (argument) {
    console.log('covered foo argument');
  }
}
function bar(argument) {
  console.log('this is bar');
  if (argument) {
    console.log('covered bar argument');
  }
}
function start() {
  console.log('this is start');
  foo(true);
}
function privateFunction() {
  console.log('this is privateFunction');
}
function init(stop) {
  console.log('this is init');
  start();
  if (stop) {
    console.log('stop in init');
    return;
  }
  const inline = a => {
    console.log('this is inline');
    if (a) {
      console.log('covered inline argument');
    }
  };
  const list = [inline];
  list.forEach(i => {
    i();
  });
  const f = false;
  if (f) {
    privateFunction();
  }
}
const onload = something => {
  console.log('this is onload');
  if (something) {
    console.log('stop with something');
    return;
  }
  console.log('on loaded');
};
init(window._my_stop_key);
onload(window._my_something);
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=coverage-v8.js.map
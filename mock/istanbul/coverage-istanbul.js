(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("coverage-istanbul", [], factory);
	else if(typeof exports === 'object')
		exports["coverage-istanbul"] = factory();
	else
		root["coverage-istanbul"] = factory();
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
function cov_2lsw6hau4b() {
  var path = "F:\\workspace\\monocart-coverage-reports\\mock\\src\\index.js";
  var hash = "b348f5aa4d4130a58e3af9577ac936ef5b44525e";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "F:\\workspace\\monocart-coverage-reports\\mock\\src\\index.js",
    statementMap: {
      "0": {
        start: {
          line: 2,
          column: 4
        },
        end: {
          line: 2,
          column: 31
        }
      },
      "1": {
        start: {
          line: 4,
          column: 4
        },
        end: {
          line: 6,
          column: 5
        }
      },
      "2": {
        start: {
          line: 5,
          column: 8
        },
        end: {
          line: 5,
          column: 44
        }
      },
      "3": {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 10,
          column: 31
        }
      },
      "4": {
        start: {
          line: 12,
          column: 4
        },
        end: {
          line: 14,
          column: 5
        }
      },
      "5": {
        start: {
          line: 13,
          column: 8
        },
        end: {
          line: 13,
          column: 44
        }
      },
      "6": {
        start: {
          line: 18,
          column: 4
        },
        end: {
          line: 18,
          column: 33
        }
      },
      "7": {
        start: {
          line: 20,
          column: 4
        },
        end: {
          line: 20,
          column: 14
        }
      },
      "8": {
        start: {
          line: 24,
          column: 4
        },
        end: {
          line: 24,
          column: 43
        }
      },
      "9": {
        start: {
          line: 28,
          column: 4
        },
        end: {
          line: 28,
          column: 32
        }
      },
      "10": {
        start: {
          line: 29,
          column: 4
        },
        end: {
          line: 29,
          column: 12
        }
      },
      "11": {
        start: {
          line: 31,
          column: 4
        },
        end: {
          line: 34,
          column: 5
        }
      },
      "12": {
        start: {
          line: 32,
          column: 8
        },
        end: {
          line: 32,
          column: 36
        }
      },
      "13": {
        start: {
          line: 33,
          column: 8
        },
        end: {
          line: 33,
          column: 15
        }
      },
      "14": {
        start: {
          line: 36,
          column: 19
        },
        end: {
          line: 41,
          column: 5
        }
      },
      "15": {
        start: {
          line: 37,
          column: 8
        },
        end: {
          line: 37,
          column: 38
        }
      },
      "16": {
        start: {
          line: 38,
          column: 8
        },
        end: {
          line: 40,
          column: 9
        }
      },
      "17": {
        start: {
          line: 39,
          column: 12
        },
        end: {
          line: 39,
          column: 51
        }
      },
      "18": {
        start: {
          line: 43,
          column: 17
        },
        end: {
          line: 43,
          column: 25
        }
      },
      "19": {
        start: {
          line: 45,
          column: 4
        },
        end: {
          line: 47,
          column: 7
        }
      },
      "20": {
        start: {
          line: 46,
          column: 8
        },
        end: {
          line: 46,
          column: 12
        }
      },
      "21": {
        start: {
          line: 49,
          column: 14
        },
        end: {
          line: 49,
          column: 19
        }
      },
      "22": {
        start: {
          line: 50,
          column: 4
        },
        end: {
          line: 52,
          column: 5
        }
      },
      "23": {
        start: {
          line: 51,
          column: 8
        },
        end: {
          line: 51,
          column: 26
        }
      },
      "24": {
        start: {
          line: 56,
          column: 15
        },
        end: {
          line: 63,
          column: 1
        }
      },
      "25": {
        start: {
          line: 57,
          column: 4
        },
        end: {
          line: 57,
          column: 34
        }
      },
      "26": {
        start: {
          line: 58,
          column: 4
        },
        end: {
          line: 61,
          column: 5
        }
      },
      "27": {
        start: {
          line: 59,
          column: 8
        },
        end: {
          line: 59,
          column: 43
        }
      },
      "28": {
        start: {
          line: 60,
          column: 8
        },
        end: {
          line: 60,
          column: 15
        }
      },
      "29": {
        start: {
          line: 62,
          column: 4
        },
        end: {
          line: 62,
          column: 29
        }
      },
      "30": {
        start: {
          line: 65,
          column: 0
        },
        end: {
          line: 65,
          column: 26
        }
      },
      "31": {
        start: {
          line: 67,
          column: 0
        },
        end: {
          line: 67,
          column: 29
        }
      }
    },
    fnMap: {
      "0": {
        name: "foo",
        decl: {
          start: {
            line: 1,
            column: 16
          },
          end: {
            line: 1,
            column: 19
          }
        },
        loc: {
          start: {
            line: 1,
            column: 30
          },
          end: {
            line: 7,
            column: 1
          }
        },
        line: 1
      },
      "1": {
        name: "bar",
        decl: {
          start: {
            line: 9,
            column: 16
          },
          end: {
            line: 9,
            column: 19
          }
        },
        loc: {
          start: {
            line: 9,
            column: 30
          },
          end: {
            line: 15,
            column: 1
          }
        },
        line: 9
      },
      "2": {
        name: "start",
        decl: {
          start: {
            line: 17,
            column: 16
          },
          end: {
            line: 17,
            column: 21
          }
        },
        loc: {
          start: {
            line: 17,
            column: 24
          },
          end: {
            line: 21,
            column: 1
          }
        },
        line: 17
      },
      "3": {
        name: "privateFunction",
        decl: {
          start: {
            line: 23,
            column: 9
          },
          end: {
            line: 23,
            column: 24
          }
        },
        loc: {
          start: {
            line: 23,
            column: 27
          },
          end: {
            line: 25,
            column: 1
          }
        },
        line: 23
      },
      "4": {
        name: "init",
        decl: {
          start: {
            line: 27,
            column: 9
          },
          end: {
            line: 27,
            column: 13
          }
        },
        loc: {
          start: {
            line: 27,
            column: 20
          },
          end: {
            line: 54,
            column: 1
          }
        },
        line: 27
      },
      "5": {
        name: "(anonymous_5)",
        decl: {
          start: {
            line: 36,
            column: 19
          },
          end: {
            line: 36,
            column: 20
          }
        },
        loc: {
          start: {
            line: 36,
            column: 26
          },
          end: {
            line: 41,
            column: 5
          }
        },
        line: 36
      },
      "6": {
        name: "(anonymous_6)",
        decl: {
          start: {
            line: 45,
            column: 17
          },
          end: {
            line: 45,
            column: 18
          }
        },
        loc: {
          start: {
            line: 45,
            column: 24
          },
          end: {
            line: 47,
            column: 5
          }
        },
        line: 45
      },
      "7": {
        name: "(anonymous_7)",
        decl: {
          start: {
            line: 56,
            column: 15
          },
          end: {
            line: 56,
            column: 16
          }
        },
        loc: {
          start: {
            line: 56,
            column: 30
          },
          end: {
            line: 63,
            column: 1
          }
        },
        line: 56
      }
    },
    branchMap: {
      "0": {
        loc: {
          start: {
            line: 4,
            column: 4
          },
          end: {
            line: 6,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 4,
            column: 4
          },
          end: {
            line: 6,
            column: 5
          }
        }, {
          start: {
            line: undefined,
            column: undefined
          },
          end: {
            line: undefined,
            column: undefined
          }
        }],
        line: 4
      },
      "1": {
        loc: {
          start: {
            line: 12,
            column: 4
          },
          end: {
            line: 14,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 12,
            column: 4
          },
          end: {
            line: 14,
            column: 5
          }
        }, {
          start: {
            line: undefined,
            column: undefined
          },
          end: {
            line: undefined,
            column: undefined
          }
        }],
        line: 12
      },
      "2": {
        loc: {
          start: {
            line: 31,
            column: 4
          },
          end: {
            line: 34,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 31,
            column: 4
          },
          end: {
            line: 34,
            column: 5
          }
        }, {
          start: {
            line: undefined,
            column: undefined
          },
          end: {
            line: undefined,
            column: undefined
          }
        }],
        line: 31
      },
      "3": {
        loc: {
          start: {
            line: 38,
            column: 8
          },
          end: {
            line: 40,
            column: 9
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 38,
            column: 8
          },
          end: {
            line: 40,
            column: 9
          }
        }, {
          start: {
            line: undefined,
            column: undefined
          },
          end: {
            line: undefined,
            column: undefined
          }
        }],
        line: 38
      },
      "4": {
        loc: {
          start: {
            line: 50,
            column: 4
          },
          end: {
            line: 52,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 50,
            column: 4
          },
          end: {
            line: 52,
            column: 5
          }
        }, {
          start: {
            line: undefined,
            column: undefined
          },
          end: {
            line: undefined,
            column: undefined
          }
        }],
        line: 50
      },
      "5": {
        loc: {
          start: {
            line: 58,
            column: 4
          },
          end: {
            line: 61,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 58,
            column: 4
          },
          end: {
            line: 61,
            column: 5
          }
        }, {
          start: {
            line: undefined,
            column: undefined
          },
          end: {
            line: undefined,
            column: undefined
          }
        }],
        line: 58
      }
    },
    s: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0,
      "8": 0,
      "9": 0,
      "10": 0,
      "11": 0,
      "12": 0,
      "13": 0,
      "14": 0,
      "15": 0,
      "16": 0,
      "17": 0,
      "18": 0,
      "19": 0,
      "20": 0,
      "21": 0,
      "22": 0,
      "23": 0,
      "24": 0,
      "25": 0,
      "26": 0,
      "27": 0,
      "28": 0,
      "29": 0,
      "30": 0,
      "31": 0
    },
    f: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0
    },
    b: {
      "0": [0, 0],
      "1": [0, 0],
      "2": [0, 0],
      "3": [0, 0],
      "4": [0, 0],
      "5": [0, 0]
    },
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "b348f5aa4d4130a58e3af9577ac936ef5b44525e"
  };
  var coverage = global[gcv] || (global[gcv] = {});
  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }
  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_2lsw6hau4b = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}
cov_2lsw6hau4b();
function foo(argument) {
  cov_2lsw6hau4b().f[0]++;
  cov_2lsw6hau4b().s[0]++;
  console.log('this is foo');
  cov_2lsw6hau4b().s[1]++;
  if (argument) {
    cov_2lsw6hau4b().b[0][0]++;
    cov_2lsw6hau4b().s[2]++;
    console.log('covered foo argument');
  } else {
    cov_2lsw6hau4b().b[0][1]++;
  }
}
function bar(argument) {
  cov_2lsw6hau4b().f[1]++;
  cov_2lsw6hau4b().s[3]++;
  console.log('this is bar');
  cov_2lsw6hau4b().s[4]++;
  if (argument) {
    cov_2lsw6hau4b().b[1][0]++;
    cov_2lsw6hau4b().s[5]++;
    console.log('covered bar argument');
  } else {
    cov_2lsw6hau4b().b[1][1]++;
  }
}
function start() {
  cov_2lsw6hau4b().f[2]++;
  cov_2lsw6hau4b().s[6]++;
  console.log('this is start');
  cov_2lsw6hau4b().s[7]++;
  foo(true);
}
function privateFunction() {
  cov_2lsw6hau4b().f[3]++;
  cov_2lsw6hau4b().s[8]++;
  console.log('this is privateFunction');
}
function init(stop) {
  cov_2lsw6hau4b().f[4]++;
  cov_2lsw6hau4b().s[9]++;
  console.log('this is init');
  cov_2lsw6hau4b().s[10]++;
  start();
  cov_2lsw6hau4b().s[11]++;
  if (stop) {
    cov_2lsw6hau4b().b[2][0]++;
    cov_2lsw6hau4b().s[12]++;
    console.log('stop in init');
    cov_2lsw6hau4b().s[13]++;
    return;
  } else {
    cov_2lsw6hau4b().b[2][1]++;
  }
  cov_2lsw6hau4b().s[14]++;
  const inline = a => {
    cov_2lsw6hau4b().f[5]++;
    cov_2lsw6hau4b().s[15]++;
    console.log('this is inline');
    cov_2lsw6hau4b().s[16]++;
    if (a) {
      cov_2lsw6hau4b().b[3][0]++;
      cov_2lsw6hau4b().s[17]++;
      console.log('covered inline argument');
    } else {
      cov_2lsw6hau4b().b[3][1]++;
    }
  };
  const list = (cov_2lsw6hau4b().s[18]++, [inline]);
  cov_2lsw6hau4b().s[19]++;
  list.forEach(i => {
    cov_2lsw6hau4b().f[6]++;
    cov_2lsw6hau4b().s[20]++;
    i();
  });
  const f = (cov_2lsw6hau4b().s[21]++, false);
  cov_2lsw6hau4b().s[22]++;
  if (f) {
    cov_2lsw6hau4b().b[4][0]++;
    cov_2lsw6hau4b().s[23]++;
    privateFunction();
  } else {
    cov_2lsw6hau4b().b[4][1]++;
  }
}
cov_2lsw6hau4b().s[24]++;
const onload = something => {
  cov_2lsw6hau4b().f[7]++;
  cov_2lsw6hau4b().s[25]++;
  console.log('this is onload');
  cov_2lsw6hau4b().s[26]++;
  if (something) {
    cov_2lsw6hau4b().b[5][0]++;
    cov_2lsw6hau4b().s[27]++;
    console.log('stop with something');
    cov_2lsw6hau4b().s[28]++;
    return;
  } else {
    cov_2lsw6hau4b().b[5][1]++;
  }
  cov_2lsw6hau4b().s[29]++;
  console.log('on loaded');
};
cov_2lsw6hau4b().s[30]++;
init(window._my_stop_key);
cov_2lsw6hau4b().s[31]++;
onload(window._my_something);
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=coverage-istanbul.js.map
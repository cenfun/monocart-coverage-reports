const Util = require('../utils/util.js');

const bindEvents = (target, events) => {
    Object.keys(events).forEach((eventType) => {
        target.on(eventType, events[eventType]);
    });
};

const unbindEvents = (target, events) => {
    Object.keys(events).forEach((eventType) => {
        target.off(eventType, events[eventType]);
    });
};

// keep same ranges with playwright
// eslint-disable-next-line complexity
const convertToDisjointRanges = (nestedRanges) => {
    const points = [];
    for (const range of nestedRanges) {
        points.push({
            offset: range.start,
            type: 0,
            range
        });
        points.push({
            offset: range.end,
            type: 1,
            range
        });
    }
    // Sort points to form a valid parenthesis sequence.
    points.sort((a, b) => {
        // Sort with increasing offsets.
        if (a.offset !== b.offset) {
            return a.offset - b.offset;
        }
        // All "end" points should go before "start" points.
        if (a.type !== b.type) {
            return b.type - a.type;
        }
        const aLength = a.range.end - a.range.start;
        const bLength = b.range.end - b.range.start;
        // For two "start" points, the one with longer range goes first.
        if (a.type === 0) {
            return bLength - aLength;
        }
        // For two "end" points, the one with shorter range goes first.
        return aLength - bLength;
    });

    const hitCountStack = [];
    const results = [];
    let lastOffset = 0;
    // Run scanning line to intersect all ranges.
    for (const point of points) {
        if (hitCountStack.length && lastOffset < point.offset && hitCountStack[hitCountStack.length - 1] > 0) {
            const lastResult = results.length ? results[results.length - 1] : null;
            if (lastResult && lastResult.end === lastOffset) {
                lastResult.end = point.offset;
            } else {
                results.push({
                    start: lastOffset,
                    end: point.offset
                });
            }
        }
        lastOffset = point.offset;
        if (point.type === 0) {
            hitCountStack.push(point.range.count);
        } else {
            hitCountStack.pop();
        }
    }
    // Filter out empty ranges.
    return results.filter((range) => range.end - range.start > 1);
};

class CoverageClient {
    constructor(session) {
        this.session = session;
    }

    // =================================================================================================
    async startJSCoverage() {
        if (!this.session || this.enabledJS) {
            return;
        }
        this.enabledJS = true;
        this.scriptSources = new Map();
        this.jsEvents = {
            'Debugger.scriptParsed': (params) => {
                const { scriptId } = params;
                this.session.send('Debugger.getScriptSource', {
                    scriptId
                }).then((res) => {
                    this.scriptSources.set(scriptId, res && res.scriptSource);
                });
            },
            'Debugger.paused': () => {
                this.send('Debugger.resume');
            }
        };

        bindEvents(this.session, this.jsEvents);

        await this.session.send('Debugger.enable');
        await this.session.send('Debugger.setSkipAllPauses', {
            skip: true
        });

        await this.session.send('Profiler.enable');
        await this.session.send('Profiler.startPreciseCoverage', {
            callCount: true,
            detailed: true
        });

        // Util.logDebug('startJSCoverage');

    }

    async stopJSCoverage() {
        if (!this.session || !this.enabledJS) {
            return;
        }

        const profileResponse = await this.session.send('Profiler.takePreciseCoverage');
        await this.session.send('Profiler.stopPreciseCoverage');
        await this.session.send('Profiler.disable');
        // await this.session.send('Debugger.disable');

        unbindEvents(this.session, this.jsEvents);
        this.jsEvents = null;

        const jsCoverage = [];

        // console.log('coverageList', coverageList);
        if (profileResponse && profileResponse.result) {
            profileResponse.result.forEach((entry) => {
                // anonymous url
                entry.url = entry.url || '';
                // add source
                const source = this.scriptSources.get(entry.scriptId);
                if (!source) {
                    Util.logDebug(`Not found js source: ${entry.url}`);
                }
                entry.source = source || '';
                jsCoverage.push(entry);
            });
        }

        this.scriptSources.clear();
        this.enabledJS = false;

        return jsCoverage;
    }

    // =================================================================================================

    async startCSSCoverage() {
        if (!this.session || this.enabledCSS) {
            return;
        }
        this.enabledCSS = true;
        this.styleEntries = new Map();

        this.cssEvents = {
            'CSS.styleSheetAdded': (e) => {
                const { sourceURL, styleSheetId } = e.header;

                // anonymous url
                const url = sourceURL || '';
                this.session.send('CSS.getStyleSheetText', {
                    styleSheetId
                }).then((res) => {
                    // add source
                    const text = res && res.text;
                    if (!text) {
                        Util.logDebug(`Not found css source: ${url}`);
                    }
                    this.styleEntries.set(styleSheetId, {
                        url,
                        text: text || '',
                        ranges: []
                    });
                });
            }
        };

        bindEvents(this.session, this.cssEvents);

        await this.session.send('DOM.enable');
        await this.session.send('CSS.enable');
        await this.session.send('CSS.startRuleUsageTracking');

        // Util.logDebug('startCSSCoverage');
    }

    async stopCSSCoverage() {
        if (!this.session || !this.enabledCSS) {
            return;
        }

        const ruleTrackingResponse = await this.session.send('CSS.stopRuleUsageTracking');
        await this.session.send('CSS.disable');
        await this.session.send('DOM.disable');

        unbindEvents(this.session, this.cssEvents);
        this.cssEvents = null;

        const cssCoverage = [];

        if (ruleTrackingResponse) {
            for (const usage of ruleTrackingResponse.ruleUsage) {
                const entry = this.styleEntries.get(usage.styleSheetId);
                if (entry) {
                    entry.ranges.push({
                        start: usage.startOffset,
                        end: usage.endOffset,
                        count: usage.used ? 1 : 0
                    });
                }
            }
            this.styleEntries.forEach((entry) => {
                entry.ranges = convertToDisjointRanges(entry.ranges);
                cssCoverage.push(entry);
            });
        }

        this.styleEntries.clear();
        this.enabledCSS = false;

        return cssCoverage;
    }

    // =================================================================================================

    async startCoverage() {
        await Promise.all([
            this.startJSCoverage(),
            this.startCSSCoverage()
        ]);
    }

    async stopCoverage() {
        if (!this.session) {
            return;
        }
        const [jsCoverage, cssCoverage] = await Promise.all([
            this.stopJSCoverage(),
            this.stopCSSCoverage()
        ]);
        // could be undefined
        let coverageList = [];
        if (jsCoverage) {
            coverageList = coverageList.concat(jsCoverage);
        }
        if (cssCoverage) {
            coverageList = coverageList.concat(cssCoverage);
        }
        return coverageList;
    }

    // =================================================================================================
    // write the coverage started by NODE_V8_COVERAGE to disk on demand
    async writeCoverage() {
        if (!this.session) {
            return;
        }

        await this.session.send('Runtime.enable');

        // write the coverage started by NODE_V8_COVERAGE to disk on demand
        const res = await this.session.send('Runtime.evaluate', {
            expression: `new Promise((resolve) => { 
                require("v8").takeCoverage();
                resolve(process.env.NODE_V8_COVERAGE);
            })`,
            includeCommandLineAPI: true,
            returnByValue: true,
            awaitPromise: true
        });

        await this.session.send('Runtime.disable');

        return res && res.result && res.result.value;
    }

    // get istanbul coverage data
    async getIstanbulCoverage(coverageKey = '__coverage__') {
        if (!this.session) {
            return;
        }

        await this.session.send('Runtime.enable');

        // both browser and Node.js
        const res = await this.session.send('Runtime.evaluate', {
            expression: `new Promise((resolve) => { 
                const globalTarget = typeof window !== 'undefined' ? window : global;
                resolve(globalTarget['${coverageKey}']);
            })`,
            includeCommandLineAPI: true,
            returnByValue: true,
            awaitPromise: true
        });

        await this.session.send('Runtime.disable');

        return res && res.result && res.result.value;
    }

    // =================================================================================================
    async close() {
        if (!this.session) {
            return;
        }
        await this.session.detach();
        this.session = null;
    }
}

module.exports = CoverageClient;

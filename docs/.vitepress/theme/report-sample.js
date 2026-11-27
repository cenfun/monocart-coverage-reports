// Captured with color enabled from the V8 integration example. The details
// reporter is filtered to three branch fixtures and shows bytes and lines.
const samples = {
    'console-summary': `[MCR] \u001b[36mMy V8 Coverage Report\u001b[39m
┌────────────┬────────────┬─────────┬───────────┬────────┐
│ Name       │ Coverage % │ Covered │ Uncovered │  Total │
├────────────┼────────────┼─────────┼───────────┼────────┤
│ Bytes      │    \u001b[33m73.22 %\u001b[39m │  17,442 │     6,380 │ 23,822 │
│ Statements │    \u001b[32m82.16 %\u001b[39m │     433 │        94 │    527 │
│ Branches   │    \u001b[33m59.46 %\u001b[39m │     154 │       105 │    259 │
│ Functions  │    \u001b[33m78.57 %\u001b[39m │      66 │        18 │     84 │
│ Lines      │    \u001b[33m61.09 %\u001b[39m │     559 │       356 │    915 │
└────────────┴────────────┴─────────┴───────────┴────────┘`,
    'console-details': `[MCR] \u001b[36mMy V8 Coverage Report\u001b[39m
┌──────────────────────┬─────────┬─────────┬─────────────────────────────┐
│ Name                 │   Bytes │   Lines │ Uncovered Lines             │
├──────────────────────┼─────────┼─────────┼─────────────────────────────┤
│ test/mock/src/branch │         │         │                             │
│ ├ \u001b[33mbranch.js\u001b[39m          │ \u001b[32m81.98 %\u001b[39m │ \u001b[33m74.78 %\u001b[39m │ \u001b[33m11\u001b[39m\u001b[31m-\u001b[39m\u001b[31m21\u001b[39m,\u001b[33m29\u001b[39m,\u001b[33m58\u001b[39m\u001b[31m-\u001b[39m\u001b[31m61\u001b[39m,\u001b[33m75\u001b[39m,\u001b[33m82\u001b[39m\u001b[31m-\u001b[39m\u001b[31m84\u001b[39m,... │
│ ├ \u001b[33mif.js\u001b[39m              │ \u001b[33m67.60 %\u001b[39m │ \u001b[33m54.64 %\u001b[39m │ \u001b[33m28\u001b[39m\u001b[31m-\u001b[39m\u001b[31m30\u001b[39m,\u001b[33m34\u001b[39m\u001b[31m-\u001b[39m\u001b[31m36\u001b[39m,\u001b[33m40\u001b[39m\u001b[31m-\u001b[39m\u001b[31m44\u001b[39m,\u001b[33m57\u001b[39m\u001b[31m-\u001b[39m\u001b[31m59\u001b[39m,... │
│ └ \u001b[32mlogical.js\u001b[39m         │ \u001b[32m95.25 %\u001b[39m │ \u001b[32m82.14 %\u001b[39m │ \u001b[33m22\u001b[39m\u001b[33m-\u001b[39m\u001b[33m23\u001b[39m,\u001b[33m33\u001b[39m\u001b[33m-\u001b[39m\u001b[33m34\u001b[39m,\u001b[33m38\u001b[39m,\u001b[33m45\u001b[39m,\u001b[33m48\u001b[39m\u001b[33m-\u001b[39m\u001b[33m49\u001b[39m,... │
├──────────────────────┼─────────┼─────────┼─────────────────────────────┤
│ \u001b[33mSummary\u001b[39m              │ \u001b[33m73.22 %\u001b[39m │ \u001b[33m61.09 %\u001b[39m │                             │
└──────────────────────┴─────────┴─────────┴─────────────────────────────┘`
};

// This palette covers the foreground SGR codes in the captured output.
const colors = {
    31: 'ansi-red',
    32: 'ansi-green',
    33: 'ansi-yellow',
    36: 'ansi-cyan'
};

const colorize = (output) => {
    const [prefix, ... chunks] = output.split('\u001b[');
    return [{
        text: prefix
    }, ... chunks.flatMap((chunk) => {
        const end = chunk.indexOf('m');
        const text = chunk.slice(end + 1);
        return text ? [{
            text,
            color: colors[chunk.slice(0, end)]
        }] : [];
    })];
};

export const terminalSamples = Object.fromEntries(
    Object.entries(samples).map(([format, output]) => [format, colorize(output)])
);

const CG = require('console-grid');
const EC = require('eight-colors');

const Util = require('./util.js');

const mergeSingleSubGroups = (item) => {

    if (!item.subs) {
        return;
    }
    if (item.subs.length === 1) {
        const sub = item.subs[0];
        if (!sub.subs) {
            return;
        }
        item.name = [item.name, sub.name].filter((it) => it).join('/');
        item.subs = sub.subs;
        mergeSingleSubGroups(item);
        return;
    }

    item.subs.forEach((sub) => {
        mergeSingleSubGroups(sub);
    });

};

const getGroupedRows = (flatRows) => {
    let groups = [];
    flatRows.forEach((file) => {
        const pathList = file.name.split('/');
        const lastName = pathList.pop();
        let subs = groups;
        pathList.forEach((key) => {
            const item = subs.find((it) => it.name === key && it.subs);
            if (item) {
                subs = item.subs;
                return;
            }
            const sub = {
                name: key,
                subs: []
            };
            subs.push(sub);
            subs = sub.subs;
        });

        let filename = lastName;
        if (file.nameStatus) {
            filename = Util.getColorStrByStatus(lastName, file.nameStatus, 'ansicode');
        }
        file.name = filename;
        subs.push(file);
    });
    const group = {
        subs: groups
    };
    mergeSingleSubGroups(group);
    if (group.name) {
        groups = [group];
    }
    return groups;
};

// ============================================================

const diffUncoveredLines = (list) => {
    const [oldStr, newStr] = list;

    const oldList = oldStr.split(',');
    const newList = newStr.split(',');

    const oldColor = oldList.map((it) => {
        if (newList.includes(it)) {
            return it;
        }
        return EC.green(it);
    }).join(',');

    const newColor = newList.map((it) => {
        if (oldList.includes(it)) {
            return it;
        }
        return EC.red(it);
    }).join(',');

    return [oldColor, newColor];
};

const getDiffMessage = (results, columns, diffOptions) => {
    const flatRows = [];
    results.forEach((it) => {
        if (!it.change && diffOptions.skipEqual) {
            return;
        }
        flatRows.push(it);
    });

    const rows = getGroupedRows(flatRows);

    const addedList = [];
    Util.forEach(rows, (it, parent) => {
        if (!it.change) {
            return;
        }
        //  add color
        if (it.change === '-' || it.change === '+') {
            columns.forEach((c) => {
                const k = c.id;
                let v = it[k];
                if (k === 'name') {
                    v = `${it.change} ${v}`;
                }
                it[k] = EC.red(v);
            });
            return;
        }

        // diff
        const cloneRow = {};
        columns.forEach((c) => {
            const k = c.id;
            let v = it[k];
            if (Array.isArray(v)) {
                if (k === 'uncoveredLines') {
                    v = diffUncoveredLines(v);
                } else {
                    v = [EC.green(v[0]), EC.red(v[1])];
                }
                it[k] = v[0];
                cloneRow[k] = v[1];
                return;
            }
            it[k] = v;
            cloneRow[k] = '';
        });

        addedList.push({
            subs: parent ? parent.subs : rows,
            row: it,
            cloneRow
        });

    });

    addedList.forEach((it) => {
        const {
            subs, row, cloneRow
        } = it;
        const i = subs.findIndex((r) => r === row);
        subs.splice(i + 1, 0, cloneRow);
    });

    // add innerBorder for summary
    const summaryIndex = rows.findIndex((it) => it.isSummary);
    if (summaryIndex !== -1) {
        rows.splice(summaryIndex, 0, {
            innerBorder: true
        });
    }

    const lines = CG({
        options: {
            silent: true,
            nullPlaceholder: '',
            defaultMaxWidth: diffOptions.maxCols
        },
        columns,
        rows
    });

    return lines.join('\n');
};


// ============================================================

const getSnapshot = (reportData) => {
    const {
        summary, files, type
    } = reportData;
    const snapshot = {
        type,
        summary: {},
        files: {}
    };

    const addPercent = (target, fromSummary) => {
        Object.keys(fromSummary).forEach((k) => {
            let percent = fromSummary[k].pct;
            if (typeof percent === 'number') {
                percent = Util.PSF(percent, 100, 2);
            }
            target[k] = percent;
        });
    };

    addPercent(snapshot.summary, summary);

    files.sort((a, b) => {
        if (a.sourcePath > b.sourcePath) {
            return 1;
        }
        return -1;
    });
    files.forEach((file) => {
        // do NOT add debug file
        if (file.debug) {
            return;
        }
        const fileSummary = {};
        addPercent(fileSummary, file.summary);
        fileSummary.uncoveredLines = Util.getUncoveredLines(file.data.lines);

        // no extras for istanbul
        const extras = file.data.extras;
        fileSummary.extras = Object.keys(extras).map((k) => {
            return k + extras[k];
        }).join(',');

        snapshot.files[file.sourcePath] = fileSummary;
    });

    return snapshot;
};

const diffSnapshot = (oldData, newData, diffOptions) => {

    diffOptions = {
        skipEqual: true,
        showSummary: true,
        maxCols: 50,
        metrics: [],
        ... diffOptions
    };

    let change = false;
    const results = [];

    const metrics = Util.getMetrics(diffOptions.metrics, oldData.type);
    const columns = [{
        id: 'name',
        name: 'Name'
    }, ... metrics.map((m) => {
        return {
            id: m,
            name: Util.capitalizeFirstLetter(m),
            align: 'right'
        };
    }), {
        id: 'uncoveredLines',
        name: 'Uncovered Lines'
    }];

    const keys = columns.map((it) => it.id).filter((it) => it !== 'name');
    const oFiles = oldData.files;
    const nFiles = newData.files;

    Object.keys(oFiles).forEach((oPath) => {

        const oSummary = oFiles[oPath];

        const diffResult = {
            name: oPath
        };
        keys.forEach((k) => {
            diffResult[k] = oSummary[k];
        });

        const nSummary = nFiles[oPath];
        if (nSummary) {

            let fileChange = false;
            keys.forEach((k) => {
                const oValue = oSummary[k];
                const nValue = nSummary[k];
                if (oValue !== nValue) {
                    change = true;
                    fileChange = true;
                    diffResult[k] = [oValue, nValue];
                }
            });

            diffResult.change = fileChange;

        } else {
            change = true;
            diffResult.change = '-';
        }

        results.push(diffResult);

    });

    // added
    Object.keys(nFiles).forEach((nPath) => {
        const oSummary = oFiles[nPath];
        if (oSummary) {
            return;
        }
        const nSummary = nFiles[nPath];
        const diffResult = {
            name: nPath,
            change: '+'
        };
        change = true;
        keys.forEach((k) => {
            diffResult[k] = nSummary[k];
        });
        results.push(diffResult);
    });

    if (diffOptions.showSummary) {
        const oSummary = oldData.summary;
        const nSummary = newData.summary;
        const diffResult = {
            name: 'Summary',
            isSummary: true,
            change: false
        };
        keys.forEach((k) => {
            const oValue = oSummary[k];
            const nValue = nSummary[k];
            if (oValue === nValue) {
                diffResult[k] = oValue;
            } else {
                change = true;
                diffResult.change = true;
                diffResult[k] = [oValue, nValue];
            }
        });
        results.push(diffResult);
    }

    const message = getDiffMessage(results, columns, diffOptions);

    return {
        change,
        results,
        message
    };
};

module.exports = {
    getGroupedRows,
    getSnapshot,
    diffSnapshot
};

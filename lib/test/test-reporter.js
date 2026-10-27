import fs from 'node:fs';
import { Transform } from 'node:stream';

const reporterOptions = new URL(import.meta.url).searchParams;

const getStatus = (type, data) => {
    if (data.skip) {
        return 'skipped';
    }
    if (data.todo) {
        return 'todo';
    }
    const failureType = data.details.error?.failureType;
    if (['cancelledByParent', 'testTimeoutFailure', 'testAborted'].includes(failureType)) {
        return 'cancelled';
    }
    return type === 'test:pass' ? 'passed' : 'failed';
};

const reservedErrorKeys = new Set(['name', 'message', '__proto__', 'constructor', 'prototype']);

const getErrorString = (error, key, fallback) => {
    // Standard Error names are usually inherited. Resolve only these fixed
    // fields through descriptors, without invoking accessors or coercion hooks.
    for (let current = error; current; current = Object.getPrototypeOf(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor) {
            return typeof descriptor.value === 'string' ? descriptor.value : fallback;
        }
    }
    return fallback;
};

const getErrorPrimitive = (value) => {
    if (value === null) {
        return null;
    }
    switch (typeof value) {
        case 'string':
        case 'boolean':
            return value;
        case 'number':
            if (Number.isFinite(value)) {
                return value;
            }
            return;
        case 'bigint':
            return String(value);
        default:
            break;
    }
};

const getError = (error) => {
    if (!error) {
        return;
    }
    const result = {
        name: getErrorString(error, 'name', 'Error'),
        message: getErrorString(error, 'message', '')
    };
    // Copy only own enumerable data properties, never getters or object graphs.
    // Primitive fields may still contain secrets or large strings; redact them
    // in onTestEnd before raw/debug export when appropriate.
    for (const key of Object.keys(error)) {
        if (reservedErrorKeys.has(key)) {
            continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(error, key);
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
            continue;
        }
        const value = getErrorPrimitive(descriptor.value);
        if (typeof value !== 'undefined') {
            result[key] = value;
        }
    }
    return result;
};

const getTestResult = (type, data) => ({
    name: data.name,
    type: data.details.type || 'test',
    nesting: data.nesting,
    testNumber: data.testNumber,
    file: data.file,
    line: data.line,
    column: data.column,
    duration: data.details.duration_ms,
    status: getStatus(type, data),
    skip: data.skip,
    todo: data.todo,
    error: getError(data.details.error)
});

const getSummary = (data) => ({
    tests: data.counts.tests,
    suites: data.counts.suites,
    passed: data.counts.passed,
    failed: data.counts.failed,
    cancelled: data.counts.cancelled,
    skipped: data.counts.skipped,
    todo: data.counts.todo,
    duration: data.duration_ms,
    success: data.success
});

// Node instantiates this stream without arguments. Per-collector options are
// passed through its module URL, not process.env, so collectors stay isolated.
export default class TestReporter extends Transform {
    constructor(id = reporterOptions.get('id'), metadataPath = reporterOptions.get('meta')) {
        super({
            writableObjectMode: true
        });
        this.id = id;
        this.metadataPath = metadataPath;
        this.complete = false;
        this.summary = null;
        this.recordCount = 0;
        this.pending = [];
        this.pendingBytes = 0;
        const header = `${JSON.stringify({
            id, framework: 'node:test'
        }).slice(0, -1)},"tests":[`;
        this.byteLength = Buffer.byteLength(header);
        this.push(header);
    }

    _transform(event, _encoding, callback) {
        let chunk;
        try {
            const { type, data } = event;
            if (type === 'test:summary' && !data.file) {
                this.complete = true;
                this.summary = getSummary(data);
            } else if (type === 'test:pass' || type === 'test:fail') {
                chunk = this.addRecord(getTestResult(type, data));
            }
        } catch (error) {
            callback(error);
            return;
        }
        callback(null, chunk);
    }

    addRecord(data) {
        const record = `${this.recordCount ? ',' : ''}${JSON.stringify(data)}`;
        const byteLength = Buffer.byteLength(record);
        this.recordCount += 1;
        this.byteLength += byteLength;
        this.pending.push(record);
        this.pendingBytes += byteLength;
        // Bound memory while avoiding a separate filesystem write for every
        // small record. Emit the first record without delay.
        if (this.recordCount === 1 || this.pendingBytes >= 64 * 1024) {
            return this.takePending();
        }
    }

    takePending() {
        const chunk = this.pending.join('');
        this.pending = [];
        this.pendingBytes = 0;
        return chunk;
    }

    _flush(callback) {
        let chunk;
        try {
            const { complete, summary } = this;
            chunk = `],${JSON.stringify({
                complete, summary
            }).slice(1)}`;
            this.byteLength += Buffer.byteLength(chunk);
            chunk = this.takePending() + chunk;
            if (this.metadataPath) {
                // The parent checks this small completion record and the final
                // byte count after child exit; no full JSON read is needed
                // unless onTestEnd requests the complete result object.
                fs.writeFileSync(this.metadataPath, JSON.stringify({
                    id: this.id, complete, byteLength: this.byteLength
                }));
            }
        } catch (error) {
            callback(error);
            return;
        }
        callback(null, chunk);
    }
}

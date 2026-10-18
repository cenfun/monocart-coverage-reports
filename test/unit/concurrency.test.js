import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { Concurrency } from '../../lib/platform/concurrency.js';

const deferred = () => Promise.withResolvers();

describe('Concurrency', () => {
    it('limits in-flight work, accepts synchronous handlers and can be reused', async () => {
        const queue = new Concurrency(3);
        queue.addList(Array.from({
            length: 12
        }, (_, i) => i));
        let active = 0;
        let max = 0;
        const seen = [];
        await queue.start(async (item) => {
            max = Math.max(max, ++active);
            await delay(1);
            active--;
            seen.push(item);
        });
        assert.equal(max, 3);
        assert.deepEqual(seen.sort((a, b) => a - b), Array.from({
            length: 12
        }, (_, i) => i));
        assert.equal(queue.count, 0);
        assert.equal(queue.list.length, 0);
        queue.addItem(42);
        await queue.start((item) => assert.equal(item, 42));
        await queue.start(() => assert.fail('Empty queue'));
    });

    it('propagates sync throws and promise rejections without scheduling more work', async () => {
        const queue = new Concurrency(1);
        const error = new Error('failed');
        queue.addList([1, 2]);
        await assert.rejects(queue.start(() => {
            throw error;
        }), (err) => err === error);
        queue.addList([1, 2]);
        await assert.rejects(queue.start(() => Promise.reject(error)), (err) => err === error);
        assert.equal(queue.run, null);
        assert.equal(queue.list.length, 0);
    });

    it('waits for in-flight handlers before rejecting and releasing state', async () => {
        const queue = new Concurrency(2);
        queue.addList([1, 2, 3]);
        const first = deferred();
        const second = deferred();
        const seen = [];
        const error = new Error('first failure');
        const result = queue.start((item) => {
            seen.push(item);
            return item === 1 ? first.promise : second.promise;
        });
        const rejection = assert.rejects(result, (err) => err === error);
        first.reject(error);
        await delay(0);
        assert.ok(queue.run);
        assert.throws(() => queue.start(() => {}), /already running/);
        assert.deepEqual(seen, [1, 2]);
        second.reject(new Error('also failed'));
        await rejection;
        assert.equal(queue.run, null);
        queue.addItem(4);
        await queue.start((item) => assert.equal(item, 4));
    });

    it('clear stops queued work, rejects after active work drains and permits reuse', async () => {
        const queue = new Concurrency(1);
        queue.addList([1, 2]);
        const task = deferred();
        const seen = [];
        const result = queue.start((item) => {
            seen.push(item);
            return task.promise;
        });
        const rejection = assert.rejects(result, {
            code: 'ABORT_ERR'
        });
        queue.clear();
        task.resolve();
        await rejection;
        assert.deepEqual(seen, [1]);
        queue.addItem(3);
        await queue.start((item) => assert.equal(item, 3));
    });

    it('preserves falsy rejection reasons', async () => {
        const queue = new Concurrency(1);
        queue.addItem(1);
        let rejected = false;
        await queue.start(() => Promise.reject(null)).catch((error) => {
            rejected = true;
            assert.equal(error, null);
        });
        assert.ok(rejected);
    });

    it('validates worker count and handlers', () => {
        for (const count of [0, -1, 1.5, Infinity, NaN]) {
            assert.throws(() => new Concurrency(count), RangeError);
        }
        assert.throws(() => new Concurrency().start(null), TypeError);
    });
});

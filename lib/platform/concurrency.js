class Concurrency {

    constructor(maxCount = 10) {
        if (!Number.isSafeInteger(maxCount) || maxCount < 1) {
            throw new RangeError('Concurrency must be a positive safe integer');
        }
        this.maxCount = maxCount;
        this.list = [];
        this.count = 0;
        this.run = null;
    }

    addItem(item) {
        this.list.push(item);
    }

    addList(list) {
        this.list = this.list.concat(list);
    }

    start(handler) {
        if (typeof handler !== 'function') {
            throw new TypeError('Concurrency handler must be a function');
        }
        if (this.run) {
            throw new Error('Concurrency queue is already running');
        }
        const run = {
            index: 0, failed: false, error: null
        };
        this.run = run;
        const workers = Array.from({
            length: Math.min(this.maxCount, this.list.length)
        }, () => this.worker(run, handler));
        // Drain in-flight work before settling, including after failure or clear().
        // This prevents old workers from touching a reused queue or its files.
        return Promise.all(workers).then(() => {
            if (run.failed) {
                throw run.error;
            }
        }).finally(() => {
            this.list = [];
            this.count = 0;
            this.run = null;
        });
    }

    async worker(run, handler) {
        while (!run.failed && run.index < this.list.length) {
            const index = run.index++;
            const item = this.list[index];
            this.list[index] = null;
            this.count++;
            try {
                await handler(item);
            } catch (error) {
                if (!run.failed) {
                    run.failed = true;
                    run.error = error;
                }
            } finally {
                this.count--;
            }
        }
    }

    clear() {
        this.list = [];
        if (this.run && !this.run.failed) {
            this.run.failed = true;
            this.run.error = new Error('Concurrency queue cleared');
            this.run.error.code = 'ABORT_ERR';
        }
    }

}

export { Concurrency };

import { EventEmitter } from 'node:events';

const parseMessage = (data) => {
    const message = JSON.parse(data);
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
        throw new Error('Expected a CDP message object');
    }
    return message;
};

class WSSession extends EventEmitter {
    constructor(ws, { timeout = 30000 } = {}) {
        super();
        if (!Number.isFinite(timeout) || timeout < 0) {
            throw new RangeError('WebSocket request timeout must be a non-negative finite number');
        }
        this.ws = ws;
        this.timeout = timeout;
        this.requestId = 1;
        this.requestCache = new Map();
        this.events = {
            message: (data) => this.onMessage(data),
            error: (error) => this.disconnect(error),
            close: () => {
                this.disconnect(new Error('WebSocket closed'));
                this.unbind(ws);
            }
        };
        for (const [name, handler] of Object.entries(this.events)) {
            ws.on(name, handler);
        }
    }

    onMessage(data) {
        let message;
        try {
            message = parseMessage(data);
        } catch (cause) {
            this.disconnect(new Error('Invalid WebSocket JSON message', {
                cause
            }));
            return;
        }
        const { id, method } = message;
        if (id) {
            const pending = this.requestCache.get(id);
            if (!pending) {
                return;
            }
            let error;
            if (message.error) {
                error = new Error(`Protocol error (${pending.method}): ${message.error.message}`);
                error.code = message.error.code;
                error.data = message.error.data;
            }
            this.settleRequest(id, error, message.result);
        } else if (typeof method === 'string') {
            this.emit(method, message.params, message.sessionId);
        }
    }

    settleRequest(id, error, result) {
        const pending = this.requestCache.get(id);
        if (!pending) {
            return;
        }
        this.requestCache.delete(id);
        clearTimeout(pending.timer);
        if (error) {
            pending.reject(error);
        } else {
            pending.resolve(result);
        }
    }

    send(method, params) {
        return new Promise((resolve, reject) => {
            const ws = this.ws;
            if (!ws || (typeof ws.readyState === 'number' && ws.readyState !== 1)) {
                reject(new Error('Invalid or closed websocket'));
                return;
            }
            const id = this.requestId++;
            const pending = {
                resolve, reject, method, timer: null
            };
            // Register before send: a response may arrive before its callback.
            this.requestCache.set(id, pending);
            if (this.timeout > 0) {
                pending.timer = setTimeout(() => {
                    const error = new Error(`WebSocket request timed out: ${method}`);
                    error.code = 'ETIMEDOUT';
                    this.settleRequest(id, error);
                }, this.timeout);
            }
            try {
                ws.send(JSON.stringify({
                    id, method, params: params || {}
                }), (error) => {
                    if (error) {
                        this.settleRequest(id, error);
                    }
                });
            } catch (error) {
                this.settleRequest(id, error);
            }
        });
    }

    disconnect(error) {
        const ws = this.ws;
        this.ws = null;
        for (const id of this.requestCache.keys()) {
            this.settleRequest(id, error);
        }
        if (ws) {
            ws.off('message', this.events.message);
            if (ws.readyState === 3) {
                this.unbind(ws);
            } else {
                // Keep error/close handlers until close to consume termination errors.
                ws.terminate();
            }
        }
    }

    unbind(ws) {
        if (this.events) {
            for (const [name, handler] of Object.entries(this.events)) {
                ws.off(name, handler);
            }
            this.events = null;
        }
    }

    detach() {
        this.disconnect(new Error('WebSocket detached'));
    }
}

export { WSSession };

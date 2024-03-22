const { EventEmitter } = require('events');

class WSSession extends EventEmitter {
    constructor(ws) {
        super();
        this.ws = ws;
        this.requestId = 1;
        this.requestCache = new Map();
        ws.on('message', (data, isBinary) => {

            const message = JSON.parse(data);
            // console.log(message);

            const { id, method } = message;
            if (id) {
                const request = this.requestCache.get(id);
                this.requestCache.delete(id);
                if (request) {
                    request.resolve(message.result);
                }
                return;
            }

            if (method) {
                this.emit(method, message.params, message.sessionId);
            }

        });
    }

    send(method, params) {
        return new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('Invalid websocket'));
                return;
            }
            const id = this.requestId++;
            const message = {
                id,
                method,
                params: params || {}
            };
            this.ws.send(JSON.stringify(message), (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.requestCache.set(id, {
                    resolve
                });
            });
        });
    }

    detach() {
        if (this.ws) {
            this.ws.terminate();
            this.ws = null;
        }
    }
}

module.exports = WSSession;

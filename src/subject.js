export class Subject {
    constructor(resolveImmediately = false) {
        this.resetIfClosed();
        if (resolveImmediately) {
            this.resolve();
        }
    }

    resetIfClosed() {
        if (this.isPending) return;

        this._isFulfilled = false;
        this._isRejected = false;

        this.promise = new Promise((res, rej) => {
            this._resolve = res;
            this._reject = rej;
        });
        return this;
    }

    get isClosed() {
        return this._isFulfilled || this._isRejected;
    }
    get isPending() {
        return !this._isFulfilled && !this._isRejected;
    }
    get isFulfilled() {
        return this._isFulfilled;
    }
    get isRejected() {
        return this._isRejected;
    }

    resolve(value) {
        if (this.isClosed) {
            return;
        }
        this._isFulfilled = true;
        this._resolve(value);
    }

    reject(reason) {
        if (this.isClosed) {
            return;
        }
        this._isRejected = true;
        this._reject(reason);
    }

    async then(onfulfilled) {
        const result = await this.promise;
        return onfulfilled?.(result) ?? result;
    }
}

import RecursiveCancelablePromiseStopError from './RecursiveCancelablePromiseStopError';

const RecursiveCancelablePromiseResultStopped = 'RecursiveCancelablePromiseResult::STOPPED';

export default class RecursiveCancelablePromiseResult<T = void> {
    private readonly result: T | typeof RecursiveCancelablePromiseResultStopped;

    constructor(result: T | typeof RecursiveCancelablePromiseResultStopped) {
        this.result = result;
    }

    isCanceled = (): boolean => this.result === RecursiveCancelablePromiseResultStopped;

    get = (): T => {
        if (this.result === RecursiveCancelablePromiseResultStopped) {
            throw new RecursiveCancelablePromiseStopError();
        }
        return this.result;
    };
}

export function createResultCompleted<T>(result: T) {
    return new RecursiveCancelablePromiseResult(result);
}

export function createResultStopped<T>() {
    return new RecursiveCancelablePromiseResult<T>(RecursiveCancelablePromiseResultStopped);
}

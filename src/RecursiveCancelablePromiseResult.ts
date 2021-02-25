import { RCPCancelError } from './RecursiveCancelablePromiseCancelError';

const RCPResultCanceled = 'RCPResult::CANCELED';

export class RCPResult<T = void> {
    private readonly result: T | typeof RCPResultCanceled;

    constructor(result: T | typeof RCPResultCanceled) {
        this.result = result;
    }

    isCanceled = (): boolean => this.result === RCPResultCanceled;

    get = (): T => {
        if (this.result === RCPResultCanceled) {
            throw new RCPCancelError();
        }
        return this.result;
    };
}

export function createResultCompleted<T>(result: T) {
    return new RCPResult(result);
}

export function createResultStopped<T>() {
    return new RCPResult<T>(RCPResultCanceled);
}

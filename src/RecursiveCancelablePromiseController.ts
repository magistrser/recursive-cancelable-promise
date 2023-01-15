import { RCPCancelError } from './RecursiveCancelablePromiseCancelError';
import { CancelablePromise, RCPErrorCallback } from './index';

export interface RCPControllerInterface {
    isCanceled: () => boolean;
    sync: (doIfCanceled?: () => void) => void;
    subscribe: <T>(promiseCreator: () => CancelablePromise<T>) => CancelablePromise<T>;
}

export class RCPController implements RCPControllerInterface {
    private readonly errorCallback?: RCPErrorCallback;
    private isCanceledFlag = false;
    private subscribedCancelablePromises: CancelablePromise<any>[] = [];

    constructor(errorCallback?: RCPErrorCallback) {
        this.errorCallback = errorCallback;
    }

    cancelSignal = () => {
        this.isCanceledFlag = true;
        this.cancelSubscribedCancelablePromises();
    };

    isCanceled = (): boolean => this.isCanceledFlag;

    sync = (doIfCanceled?: () => void): void => {
        if (this.isCanceledFlag) {
            doIfCanceled?.();
            throw new RCPCancelError();
        }
    };

    subscribe = <T>(promiseCreator: () => CancelablePromise<T>): CancelablePromise<T> => {
        if (this.isCanceledFlag) {
            throw new RCPCancelError();
        }

        const promise = promiseCreator();
        this.subscribedCancelablePromises.push(promise);

        if (this.isCanceledFlag) {
            this.cancelSubscribedCancelablePromises();
        }

        return promise;
    };

    private cancelSubscribedCancelablePromises = (): void => {
        for (const cancelablePromise of this.subscribedCancelablePromises) {
            cancelablePromise.cancel();
        }
    };
}

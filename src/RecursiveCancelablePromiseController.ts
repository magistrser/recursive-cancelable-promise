import RecursiveCancelablePromiseStopError from './RecursiveCancelablePromiseStopError';
import { Cancelable, RecursiveCancelablePromiseErrorCallback } from './index';

export default interface RecursiveCancelablePromiseController {
    isStopped: () => boolean;
    sync: () => void;
    subscribe: (promiseCreator: () => Cancelable) => void;
}

export class _RecursiveCancelablePromiseController {
    private readonly errorCallback?: RecursiveCancelablePromiseErrorCallback;
    private isStoppedFlag = false;
    private subscribedCancelablePromises: Cancelable[] = [];

    constructor(errorCallback?: RecursiveCancelablePromiseErrorCallback) {
        this.errorCallback = errorCallback;
    }

    stopSignal = () => {
        this.isStoppedFlag = true;
        this.stopSubscribedCancelablePromises();
    };

    isStopped = (): boolean => this.isStoppedFlag;

    sync = async (doIfStopped?: () => Promise<void>) => {
        if (this.isStoppedFlag) {
            doIfStopped && (await doIfStopped());
            throw new RecursiveCancelablePromiseStopError();
        }
    };

    subscribe = (promiseCreator: () => Cancelable): void => {
        if (this.isStoppedFlag) {
            return;
        }

        this.subscribedCancelablePromises.push(promiseCreator());

        if (this.isStoppedFlag) {
            this.stopSubscribedCancelablePromises();
        }
    };

    private stopSubscribedCancelablePromises = (): void => {
        for (const cancelablePromise of this.subscribedCancelablePromises) {
            (async (): Promise<void> => {
                try {
                    await cancelablePromise.cancel();
                } catch (error) {
                    this.errorCallback && (await this.errorCallback(error));
                }
            })();
        }
    };
}

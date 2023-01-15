import { CancelablePromiseType } from 'cancelable-promise';
import { RCPControllerInterface } from './RecursiveCancelablePromiseController';
import { RCPCancelError } from './RecursiveCancelablePromiseCancelError';
import RecursiveCancelablePromise from './index';

export function wrapCancelablePromise<T>(cancelablePromise: CancelablePromiseType<T>): RecursiveCancelablePromise<T> {
    return new RecursiveCancelablePromise<T>(
        async (controller: RCPControllerInterface): Promise<T> => {
            return new Promise((resolve, reject) =>
                cancelablePromise
                    .then((result) => resolve(result as T))
                    .catch((error) => reject(error))
                    .finally(() => reject(new RCPCancelError())),
            );
        },
        undefined,
        async (): Promise<void> => {
            cancelablePromise.cancel();
        },
    );
}

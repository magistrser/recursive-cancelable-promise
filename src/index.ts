import { RCPResult, createResultCompleted, createResultStopped } from './RecursiveCancelablePromiseResult';
import { RCPController, _RCPController } from './RecursiveCancelablePromiseController';
import { RCPCancelError } from './RecursiveCancelablePromiseCancelError';

export type RCPErrorCallback = (error: any) => Promise<void>;
export type RCPExecutorCancel = () => Promise<void>;

export type RCPExecutorTry<T = void> = (controller: RCPController) => Promise<T>;
export type RCPExecutorCatch<T = void> = (controller: RCPController, error: any) => Promise<T>;

export interface CancelablePromise<T> extends Promise<T> {
    cancel: () => void;
    isCanceled(): boolean;
}

export default class RecursiveCancelablePromise<T = void>
    extends Promise<RCPResult<T>>
    implements CancelablePromise<RCPResult<T>> {
    private readonly controller: _RCPController;
    private readonly executorCancel?: RCPExecutorCancel;
    private readonly errorCallback?: RCPErrorCallback;

    constructor(
        executorTry: RCPExecutorTry<T>,
        executorCatch?: RCPExecutorCatch<T>,
        executorCancel?: RCPExecutorCancel,
        errorCallback?: RCPErrorCallback,
    ) {
        const controller = new _RCPController(errorCallback);
        super(async function (resolve, reject) {
            try {
                const result = await executorTry(controller);
                resolve(controller.isCanceled() ? createResultStopped<T>() : createResultCompleted<T>(result));
            } catch (errorExecutorTry) {
                if (errorExecutorTry instanceof RCPCancelError || controller.isCanceled()) {
                    resolve(createResultStopped<T>());
                    return;
                }

                if (!executorCatch) {
                    reject(errorExecutorTry);
                    return;
                }

                try {
                    const result = await executorCatch(controller, errorExecutorTry);
                    resolve(controller.isCanceled() ? createResultStopped<T>() : createResultCompleted<T>(result));
                } catch (errorExecutorCatch) {
                    if (errorExecutorCatch instanceof RCPCancelError || controller.isCanceled()) {
                        resolve(createResultStopped<T>());
                        return;
                    }

                    reject(errorExecutorCatch);
                }
            }
        });

        this.controller = controller;
        this.executorCancel = executorCancel;
        this.errorCallback = errorCallback;
    }

    cancel(): void {
        if (this.isCanceled()) {
            return;
        }

        this.controller.cancelSignal();
        this.executorCancel && this.executorCancel().catch((error) => this.errorCallback && this.errorCallback(error));
    }

    static async cancel<T>(promise: RecursiveCancelablePromise<T>): Promise<RCPResult<T>> {
        promise.cancel();
        return promise;
    }

    isCanceled(): boolean {
        return this.controller.isCanceled();
    }

    static get [Symbol.species]() {
        return Promise;
    }

    get [Symbol.toStringTag]() {
        return 'RecursiveCancelablePromise';
    }
}

export * from './RecursiveCancelablePromiseCancelError';
export * from './RecursiveCancelablePromiseController';
export * from './RecursiveCancelablePromiseResult';
export * from './utils';

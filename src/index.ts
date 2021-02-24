import RecursiveCancelablePromiseResult, {
    createResultCompleted,
    createResultStopped,
} from './RecursiveCancelablePromiseResult';
import RecursiveCancelablePromiseController, {
    _RecursiveCancelablePromiseController,
} from './RecursiveCancelablePromiseController';
import RecursiveCancelablePromiseStopError from './RecursiveCancelablePromiseStopError';

export type RecursiveCancelablePromiseErrorCallback = (error: any) => Promise<void>;
export type RecursiveCancelablePromiseExecutorStop = () => Promise<void> | void;

export type RecursiveCancelablePromiseExecutorTry<T = void> = (
    controller: RecursiveCancelablePromiseController,
) => Promise<T>;

export type RecursiveCancelablePromiseExecutorCatch<T = void> = (
    controller: RecursiveCancelablePromiseController,
    error: any,
) => Promise<T>;

export interface Cancelable {
    cancel: RecursiveCancelablePromiseExecutorStop;
}

export default class RecursiveCancelablePromise<T = void>
    extends Promise<RecursiveCancelablePromiseResult<T>>
    implements Cancelable {
    private readonly controller: _RecursiveCancelablePromiseController;
    private readonly executorStop?: RecursiveCancelablePromiseExecutorStop;
    private readonly errorCallback?: RecursiveCancelablePromiseErrorCallback;

    // @ts-ignore, super must be first
    constructor(
        executorTry: RecursiveCancelablePromiseExecutorTry<T>,
        executorCatch?: RecursiveCancelablePromiseExecutorCatch<T>,
        executorStop?: RecursiveCancelablePromiseExecutorStop,
        errorCallback?: RecursiveCancelablePromiseErrorCallback,
    ) {
        const controller = new _RecursiveCancelablePromiseController(errorCallback);
        super(async (resolve, reject) => {
            try {
                resolve(createResultCompleted<T>(await executorTry(controller)));
            } catch (errorExecutorTry) {
                if (errorExecutorTry instanceof RecursiveCancelablePromiseStopError) {
                    resolve(createResultStopped<T>());
                    return;
                }

                if (!executorCatch) {
                    reject(errorExecutorTry);
                    return;
                }

                try {
                    resolve(createResultCompleted<T>(await executorCatch(controller, errorExecutorTry)));
                } catch (errorExecutorCatch) {
                    reject(errorExecutorCatch);
                }
            }
        });

        this.controller = controller;
        this.executorStop = executorStop;
        this.errorCallback = errorCallback;
    }

    cancel = async (): Promise<void> => {
        this.controller.stopSignal();
        this.executorStop && (await this.executorStop());

        try {
            await this;
        } catch (error) {
            this.errorCallback && (await this.errorCallback(error));
        }
    };

    static get [Symbol.species]() {
        return Promise;
    }

    get [Symbol.toStringTag]() {
        return 'RecursiveCancelablePromise';
    }
}

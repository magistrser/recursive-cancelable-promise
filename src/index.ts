import RecursiveCancelablePromiseResult, {
    createResultCompleted,
    createResultStopped,
} from './RecursiveCancelablePromiseResult';
import RecursiveCancelablePromiseController, {
    _RecursiveCancelablePromiseController,
} from './RecursiveCancelablePromiseController';
import RecursiveCancelablePromiseStopError from './RecursiveCancelablePromiseStopError';

type RecursiveCancelablePromiseExecutorStop = () => Promise<void>;
type RecursiveCancelablePromiseExecutorTry<T = void> = (controller: RecursiveCancelablePromiseController) => Promise<T>;
type RecursiveCancelablePromiseExecutorCatch<T = void> = (
    controller: RecursiveCancelablePromiseController,
    error: any,
) => Promise<T>;

export default class RecursiveCancelablePromise<T = void> extends Promise<RecursiveCancelablePromiseResult<T>> {
    private readonly controller: _RecursiveCancelablePromiseController;
    private readonly executorStop?: RecursiveCancelablePromiseExecutorStop;

    // @ts-ignore, super must be first
    constructor(
        executorTry: RecursiveCancelablePromiseExecutorTry<T>,
        executorCatch?: RecursiveCancelablePromiseExecutorCatch<T>,
        executorStop?: RecursiveCancelablePromiseExecutorStop,
    ) {
        const controller = new _RecursiveCancelablePromiseController();
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
    }

    cancel = async (onError?: (error: any) => void): Promise<void> => {
        this.controller.stopSignal();
        this.executorStop && (await this.executorStop());

        try {
            await this;
        } catch (error) {
            onError && onError(error);
        }
    };

    static get [Symbol.species]() {
        return Promise;
    }

    get [Symbol.toStringTag]() {
        return 'RecursiveCancelablePromise';
    }
}

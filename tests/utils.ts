import RecursiveCancelablePromise, { RCPController, RCPExecutorCancel } from '../lib';

export function createTestPromiseTryHandleBuilder(
    expectedValue: number,
    doIn?: (controller: RCPController) => Promise<void>,
    executorCancel?: RCPExecutorCancel,
): () => RecursiveCancelablePromise<number> {
    return () =>
        new RecursiveCancelablePromise(
            async (controller: RCPController): Promise<number> => {
                return createRCPExecutor(controller, expectedValue, doIn);
            },
            undefined,
            executorCancel,
        );
}

export function createTestPromiseCatchHandleBuilder(
    expectedValue: number,
    doIn?: (controller: RCPController) => Promise<void>,
    executorCancel?: RCPExecutorCancel,
): () => RecursiveCancelablePromise<number> {
    return () =>
        new RecursiveCancelablePromise(
            async (controller: RCPController): Promise<number> => {
                throw expectedValue;
            },
            async (controller: RCPController, error: number): Promise<number> => {
                if (error !== expectedValue) {
                    throw new Error(`Unexpected error: ${error}`);
                }
                return createRCPExecutor(controller, expectedValue, doIn);
            },
            executorCancel,
        );
}

async function createRCPExecutor(
    controller: RCPController,
    expectedValue: number,
    doIn?: (controller: RCPController) => Promise<void>,
): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
        doIn && (await doIn(controller));

        let interval: NodeJS.Timer | null = null;

        const timer = setTimeout(() => {
            interval && clearInterval(interval);
            resolve(expectedValue);
        }, 2e3);

        interval = setInterval(async () => {
            if (controller.isCanceled()) {
                clearTimeout(timer);
                interval && clearInterval(interval);

                try {
                    await controller.sync();
                    reject('Unexpected behavior, sync must return RCPCancelError if controller.isCanceled()');
                } catch (error) {
                    reject(error);
                }
            }
        }, 100);
    });
}

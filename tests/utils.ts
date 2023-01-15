import RecursiveCancelablePromise, { RCPControllerInterface, RCPExecutorCancel } from 'recursive-cancelable-promise';

export function createTestPromiseTryHandleBuilder(
    expectedValue: number,
    doIn?: (controller: RCPControllerInterface) => Promise<void>,
    executorCancel?: RCPExecutorCancel,
): () => RecursiveCancelablePromise<number> {
    return () =>
        new RecursiveCancelablePromise(
            async (controller: RCPControllerInterface): Promise<number> => {
                return createRCPExecutor(controller, expectedValue, doIn);
            },
            undefined,
            executorCancel,
        );
}

export function createTestPromiseCatchHandleBuilder(
    expectedValue: number,
    doIn?: (controller: RCPControllerInterface) => Promise<void>,
    executorCancel?: RCPExecutorCancel,
): () => RecursiveCancelablePromise<number> {
    return () =>
        new RecursiveCancelablePromise(
            async (_controller: RCPControllerInterface): Promise<number> => {
                throw expectedValue;
            },
            async (controller: RCPControllerInterface, error: number): Promise<number> => {
                if (error !== expectedValue) {
                    throw new Error(`Unexpected error: ${error}`);
                }
                return createRCPExecutor(controller, expectedValue, doIn);
            },
            executorCancel,
        );
}

async function createRCPExecutor(
    controller: RCPControllerInterface,
    expectedValue: number,
    doIn?: (controller: RCPControllerInterface) => Promise<void>,
): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
        await doIn?.(controller);

        let interval: NodeJS.Timer | null = null;
        const timer = setTimeout(() => {
            if (interval) {
                clearInterval(interval);
            }

            resolve(expectedValue);
        }, 2e3);

        interval = setInterval(async () => {
            if (controller.isCanceled()) {
                clearTimeout(timer);
                if (interval) {
                    clearInterval(interval);
                }

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

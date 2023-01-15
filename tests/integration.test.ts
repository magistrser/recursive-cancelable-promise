import RecursiveCancelablePromise, { RCPCancelError, RCPControllerInterface } from 'recursive-cancelable-promise';
import { createTestPromiseCatchHandleBuilder, createTestPromiseTryHandleBuilder } from './utils';

const expectedValue = 5;
const unexpectedValue = 10;

test('ExecutorTry, resolve', async () => {
    const promise = new RecursiveCancelablePromise(
        async (_controller: RCPControllerInterface): Promise<number> => {
            return expectedValue;
        },
    );
    expect(await promise).toBe(expectedValue);
});

test('ExecutorTry, reject', async () => {
    const promise = new RecursiveCancelablePromise(
        async (_controller: RCPControllerInterface): Promise<number> => {
            throw expectedValue;
        },
    );
    await expect(promise).rejects.toEqual(expectedValue);
});

test('ExecutorCatch, resolve', async () => {
    const promise = new RecursiveCancelablePromise(
        async (_controller: RCPControllerInterface): Promise<number> => {
            throw expectedValue;
        },
        async (controller: RCPControllerInterface, error: number): Promise<number> => {
            return error;
        },
    );
    expect(await promise).toBe(expectedValue);
});

test('ExecutorCatch, reject', async () => {
    const promise = new RecursiveCancelablePromise(
        async (_controller: RCPControllerInterface): Promise<number> => {
            throw unexpectedValue;
        },
        async (_controller: RCPControllerInterface, _error: number): Promise<number> => {
            throw expectedValue;
        },
    );
    await expect(promise).rejects.toEqual(expectedValue);
});

test('ExecutorCancel with ExecutorTry', async () => {
    const testObject = { stopCalled: false };
    const promise = createTestPromiseTryHandleBuilder(
        expectedValue,
        undefined,
        async (): Promise<void> => {
            testObject.stopCalled = true;
        },
    )();

    await expect(RecursiveCancelablePromise.cancel(promise)).rejects.toThrow(RCPCancelError);
    await expect(testObject.stopCalled).toBe(true);
});

test('ExecutorCancel with ExecutorCatch', async () => {
    const testObject = { stopCalled: false };
    const promise = createTestPromiseCatchHandleBuilder(
        expectedValue,
        async (): Promise<void> => {
            promise.cancel();
        },
        async (): Promise<void> => {
            testObject.stopCalled = true;
        },
    )();

    await expect(promise).rejects.toThrow(RCPCancelError);
    await expect(testObject.stopCalled).toBe(true);
});

async function testStopped<T>(promise: RecursiveCancelablePromise<T>) {
    await expect(RecursiveCancelablePromise.cancel(promise)).rejects.toThrow(RCPCancelError);
}

test('StopSignal ExecutorTry, stopped', async () => {
    const promise = createTestPromiseTryHandleBuilder(expectedValue);
    await testStopped(promise());
});

test('StopSignal ExecutorCatch, stopped', async () => {
    const promise = createTestPromiseCatchHandleBuilder(expectedValue);
    await testStopped(promise());
});

test('StopSignal ExecutorTry, stop on parent promise has effect on inner', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPControllerInterface) => {
        const innerPromise = controller.subscribe(createTestPromiseTryHandleBuilder(expectedValue));
        await expect(innerPromise).rejects.toThrow(RCPCancelError);
    })();

    await expect(RecursiveCancelablePromise.cancel(parentPromise)).rejects.toThrow(RCPCancelError);
});

test('StopSignal ExecutorCatch, stop on parent promise has effect on inner', async () => {
    const parentPromise = createTestPromiseCatchHandleBuilder(expectedValue, async (controller: RCPControllerInterface) => {
        // cancel after catch handle run
        parentPromise.cancel();

        expect(() => controller.subscribe(createTestPromiseCatchHandleBuilder(expectedValue))).toThrow(RCPCancelError);
    })();

    await expect(parentPromise).rejects.toThrow(RCPCancelError);
});

test('StopSignal ExecutorTry, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPControllerInterface) => {
        const innerPromise = controller.subscribe(createTestPromiseTryHandleBuilder(expectedValue));
        innerPromise.cancel();
        await expect(innerPromise).rejects.toThrow(RCPCancelError);
    })();

    await expect(parentPromise).resolves.toBe(expectedValue);
    expect(parentPromise.isCanceled()).toBe(false);
});

test('StopSignal ExecutorCatch, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseCatchHandleBuilder(expectedValue, async (controller: RCPControllerInterface) => {
        const innerPromise = controller.subscribe(createTestPromiseCatchHandleBuilder(expectedValue));
        await innerPromise.cancel();

        await expect(innerPromise).rejects.toThrow(RCPCancelError);
        expect(innerPromise.isCanceled()).toBe(true);
    })();

    await expect(parentPromise).resolves.toBe(expectedValue);
    expect(parentPromise.isCanceled()).toBe(false);
});

test('Flow stops after internal RCP was canceled', async () => {
    let isSecondChildRcpCalled = false;

    const parentPromise = new RecursiveCancelablePromise(async (parentController: RCPControllerInterface) => {
        await parentController.subscribe(() => {
            return new RecursiveCancelablePromise(
              async (controller: RCPControllerInterface): Promise<number> => {
                  return new Promise((resolve) => {
                      const interval = setInterval(() => {
                          if (controller.isCanceled()) {
                              clearInterval(interval);
                              resolve(0)
                          }
                      }, 200);
                  })
              },
            );
        });

        isSecondChildRcpCalled = true;
    });

    parentPromise.cancel();
    await expect(parentPromise).rejects.toThrow(RCPCancelError);

    expect(isSecondChildRcpCalled).toBe(false);
});

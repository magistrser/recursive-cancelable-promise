import RecursiveCancelablePromise, { RCPCancelError, RCPController } from 'recursive-cancelable-promise';
import { createTestPromiseCatchHandleBuilder, createTestPromiseTryHandleBuilder } from './utils';

const expectedValue = 5;
const unexpectedValue = 10;

test('ExecutorTry, resolve', async () => {
    const promise = new RecursiveCancelablePromise(
        async (controller: RCPController): Promise<number> => {
            return expectedValue;
        },
    );
    expect((await promise).get()).toBe(expectedValue);
});

test('ExecutorTry, reject', async () => {
    const promise = new RecursiveCancelablePromise(
        async (controller: RCPController): Promise<number> => {
            throw expectedValue;
        },
    );
    await expect(promise).rejects.toEqual(expectedValue);
});

test('ExecutorCatch, resolve', async () => {
    const promise = new RecursiveCancelablePromise(
        async (controller: RCPController): Promise<number> => {
            throw expectedValue;
        },
        async (controller: RCPController, error: number): Promise<number> => {
            return error;
        },
    );
    expect((await promise).get()).toBe(expectedValue);
});

test('ExecutorCatch, reject', async () => {
    const promise = new RecursiveCancelablePromise(
        async (controller: RCPController): Promise<number> => {
            throw unexpectedValue;
        },
        async (controller: RCPController, error: number): Promise<number> => {
            throw expectedValue;
        },
    );
    await expect(promise).rejects.toEqual(expectedValue);
});

test('ExecutorCancel with ExecutorTry', async () => {
    let testObject = { stopCalled: false };
    const promise = createTestPromiseTryHandleBuilder(
        expectedValue,
        undefined,
        async (): Promise<void> => {
            testObject.stopCalled = true;
        },
    )();

    await promise.cancel();
    await expect(testObject.stopCalled).toBe(true);
});

test('ExecutorCancel with ExecutorCatch', async () => {
    let testObject = { stopCalled: false };
    const promise = createTestPromiseCatchHandleBuilder(
        expectedValue,
        async (): Promise<void> => {
            // cancel after catch handle run
            promise.cancel();
        },
        async (): Promise<void> => {
            testObject.stopCalled = true;
        },
    )();

    await promise;
    await expect(testObject.stopCalled).toBe(true);
});

async function testStopped(promise: RecursiveCancelablePromise) {
    await promise.cancel();
    const promiseResult = await promise;

    expect(promise.isCanceled()).toBe(true);
    expect(promiseResult.isCanceled()).toBe(true);
    expect(promiseResult.get).toThrow(RCPCancelError);
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
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPController) => {
        const innerPromise = controller.subscribe(createTestPromiseTryHandleBuilder(expectedValue));
        const innerPromiseResult = await innerPromise;

        expect(innerPromise.isCanceled()).toBe(true);
        expect(innerPromiseResult.isCanceled()).toBe(true);
        expect(innerPromiseResult.get).toThrow(RCPCancelError);
    })();

    await parentPromise.cancel();
    const parentPromiseResult = await parentPromise;

    expect(parentPromise.isCanceled()).toBe(true);

    expect(parentPromiseResult.isCanceled()).toBe(true);
    expect(parentPromiseResult.get).toThrow(RCPCancelError);
});

test('StopSignal ExecutorCatch, stop on parent promise has effect on inner', async () => {
    const parentPromise = createTestPromiseCatchHandleBuilder(expectedValue, async (controller: RCPController) => {
        // cancel after catch handle run
        parentPromise.cancel();

        expect(() => controller.subscribe(createTestPromiseCatchHandleBuilder(expectedValue))).toThrow(RCPCancelError);
    })();

    const parentPromiseResult = await parentPromise;
    expect(parentPromise.isCanceled()).toBe(true);

    expect(parentPromiseResult.isCanceled()).toBe(true);
    expect(parentPromiseResult.get).toThrow(RCPCancelError);
});

test('StopSignal ExecutorTry, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPController) => {
        const innerPromise = controller.subscribe(createTestPromiseTryHandleBuilder(expectedValue));
        await innerPromise.cancel();

        const innerPromiseResult = await innerPromise;
        expect(innerPromise.isCanceled()).toBe(true);
        expect(innerPromiseResult.isCanceled()).toBe(true);
        expect(innerPromiseResult.get).toThrow(RCPCancelError);
    })();

    const parentPromiseResult = await parentPromise;
    expect(parentPromise.isCanceled()).toBe(false);
    expect(parentPromiseResult.isCanceled()).toBe(false);
    expect(parentPromiseResult.get()).toBe(expectedValue);
});

test('StopSignal ExecutorCatch, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseCatchHandleBuilder(expectedValue, async (controller: RCPController) => {
        const innerPromise = controller.subscribe(createTestPromiseCatchHandleBuilder(expectedValue));
        await innerPromise.cancel();

        const innerPromiseResult = await innerPromise;
        expect(innerPromise.isCanceled()).toBe(true);
        expect(innerPromiseResult.isCanceled()).toBe(true);
        expect(innerPromiseResult.get).toThrow(RCPCancelError);
    })();

    const parentPromiseResult = await parentPromise;
    expect(parentPromise.isCanceled()).toBe(false);
    expect(parentPromiseResult.isCanceled()).toBe(false);
    expect(parentPromiseResult.get()).toBe(expectedValue);
});

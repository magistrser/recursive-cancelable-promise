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
    expect((await promise).getSync()).toBe(expectedValue);
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
    expect((await promise).getSync()).toBe(expectedValue);
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

    await RecursiveCancelablePromise.cancel(promise);
    await expect(testObject.stopCalled).toBe(true);
});

test('ExecutorCancel with ExecutorCatch', async () => {
    let testObject = { stopCalled: false };
    const promise = createTestPromiseCatchHandleBuilder(
        expectedValue,
        async (): Promise<void> => {
            promise.cancel();
        },
        async (): Promise<void> => {
            testObject.stopCalled = true;
        },
    )();

    await promise;
    await expect(testObject.stopCalled).toBe(true);
});

async function testStopped<T>(promise: RecursiveCancelablePromise<T>) {
    const promiseResult = await RecursiveCancelablePromise.cancel(promise);
    expect(promise.isCanceled()).toBe(true);
    expect(promiseResult.isCanceled()).toBe(true);
    expect(promiseResult.get()).toBeNull();
    expect(promiseResult.getSync).toThrow(RCPCancelError);
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
        expect(innerPromiseResult.get()).toBeNull();
        expect(innerPromiseResult.getSync).toThrow(RCPCancelError);
    })();

    const parentPromiseResult = await RecursiveCancelablePromise.cancel(parentPromise);
    expect(parentPromise.isCanceled()).toBe(true);
    expect(parentPromiseResult.isCanceled()).toBe(true);
    expect(parentPromiseResult.get()).toBeNull();
    expect(parentPromiseResult.getSync).toThrow(RCPCancelError);
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
    expect(parentPromiseResult.get()).toBeNull();
    expect(parentPromiseResult.getSync).toThrow(RCPCancelError);
});

test('StopSignal ExecutorTry, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPController) => {
        const innerPromise = controller.subscribe(createTestPromiseTryHandleBuilder(expectedValue));
        await innerPromise.cancel();

        const innerPromiseResult = await innerPromise;
        expect(innerPromise.isCanceled()).toBe(true);
        expect(innerPromiseResult.isCanceled()).toBe(true);
        expect(innerPromiseResult.get()).toBeNull();
        expect(innerPromiseResult.getSync).toThrow(RCPCancelError);
    })();

    const parentPromiseResult = await parentPromise;
    expect(parentPromise.isCanceled()).toBe(false);
    expect(parentPromiseResult.isCanceled()).toBe(false);
    expect(parentPromiseResult.get()).toBe(expectedValue);
    expect(parentPromiseResult.getSync()).toBe(expectedValue);
});

test('StopSignal ExecutorCatch, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseCatchHandleBuilder(expectedValue, async (controller: RCPController) => {
        const innerPromise = controller.subscribe(createTestPromiseCatchHandleBuilder(expectedValue));
        await innerPromise.cancel();

        const innerPromiseResult = await innerPromise;
        expect(innerPromise.isCanceled()).toBe(true);
        expect(innerPromiseResult.isCanceled()).toBe(true);
        expect(innerPromiseResult.get()).toBeNull();
        expect(innerPromiseResult.getSync).toThrow(RCPCancelError);
    })();

    const parentPromiseResult = await parentPromise;
    expect(parentPromise.isCanceled()).toBe(false);
    expect(parentPromiseResult.isCanceled()).toBe(false);
    expect(parentPromiseResult.get()).toBe(expectedValue);
    expect(parentPromiseResult.getSync()).toBe(expectedValue);
});

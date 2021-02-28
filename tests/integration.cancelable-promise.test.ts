import RecursiveCancelablePromise, {
    RCPCancelError,
    wrapCancelablePromise,
    RCPController,
} from 'recursive-cancelable-promise';
import CancelablePromise from 'cancelable-promise';
import { createTestPromiseTryHandleBuilder } from './utils';

const expectedValue = 5;

test('cancelable-promise.wrapper resolve', async () => {
    const promise = wrapCancelablePromise(
        new CancelablePromise<number>((resolve, reject, onCancel) => {
            resolve(expectedValue);
        }),
    );

    const parentPromiseResult = await promise;
    expect(parentPromiseResult.get()).toBe(expectedValue);
});

test('cancelable-promise.wrapper reject', async () => {
    const promise = wrapCancelablePromise(
        new CancelablePromise((resolve, reject, onCancel) => {
            reject(expectedValue);
        }),
    );

    await expect(promise).rejects.toBe(expectedValue);
});

test('cancelable-promise.wrapper stop', async () => {
    const promise = wrapCancelablePromise(
        new CancelablePromise((resolve, reject, onCancel) => {
            onCancel(() => {
                resolve(expectedValue);
            });
        }),
    );

    const parentPromiseResult = await RecursiveCancelablePromise.cancel(promise);
    expect(promise.isCanceled()).toBe(true);
    expect(parentPromiseResult.isCanceled()).toBe(true);
    expect(parentPromiseResult.get()).toBeNull();
    expect(parentPromiseResult.getSync).toThrow(RCPCancelError);
});

test('cancelable-promise.wrapper integration subscribe, stop on parent promise has effect on inner', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPController) => {
        const innerPromise = controller.subscribe(() =>
            wrapCancelablePromise(
                new CancelablePromise((resolve, reject, onCancel) => {
                    onCancel(() => {
                        resolve(expectedValue);
                    });
                }),
            ),
        );
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

test('cancelable-promise.wrapper integration subscribe, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPController) => {
        const innerPromise = controller.subscribe(() =>
            wrapCancelablePromise(
                new CancelablePromise((resolve, reject, onCancel) => {
                    onCancel(() => {
                        resolve(expectedValue);
                    });
                }),
            ),
        );
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

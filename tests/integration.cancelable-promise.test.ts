import RecursiveCancelablePromise, {
    RCPCancelError,
    wrapCancelablePromise,
    RCPControllerInterface,
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

    await expect(promise).resolves.toBe(expectedValue);
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

    await expect(RecursiveCancelablePromise.cancel(promise)).rejects.toThrow(RCPCancelError);
    expect(promise.isCanceled()).toBe(true);
});

test('cancelable-promise.wrapper integration subscribe, stop on parent promise has effect on inner', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPControllerInterface) => {
        const innerPromise = controller.subscribe(() =>
            wrapCancelablePromise(
                new CancelablePromise((resolve, reject, onCancel) => {
                    onCancel(() => {
                        resolve(expectedValue);
                    });
                }),
            ),
        );

        await expect(innerPromise).rejects.toThrow(RCPCancelError);
        expect(innerPromise.isCanceled()).toBe(true);
    })();

    await expect(RecursiveCancelablePromise.cancel(parentPromise)).rejects.toThrow(RCPCancelError);
    expect(parentPromise.isCanceled()).toBe(true);
});

test('cancelable-promise.wrapper integration subscribe, stop on inner promise has no effect on parent', async () => {
    const parentPromise = createTestPromiseTryHandleBuilder(expectedValue, async (controller: RCPControllerInterface) => {
        const innerPromise = controller.subscribe(() =>
            wrapCancelablePromise(
                new CancelablePromise((resolve, reject, onCancel) => {
                    onCancel(() => {
                        resolve(expectedValue);
                    });
                }),
            ),
        );

        innerPromise.cancel()
        await expect(innerPromise).rejects.toThrow(RCPCancelError)
        expect(innerPromise.isCanceled()).toBe(true);
    })();

    await expect(parentPromise).resolves.toBe(expectedValue);
    expect(parentPromise.isCanceled()).toBe(false);
});

test('cancelable-promise.wrapper flow stops after internal RCP was canceled', async () => {
    let isSecondChildRcpCalled = false;

    const parentPromise = new RecursiveCancelablePromise(async (parentController: RCPControllerInterface) => {
        await parentController.subscribe(() => wrapCancelablePromise(
          new CancelablePromise((resolve, reject, onCancel) => {
              onCancel(() => {
                  resolve(0);
              });
          }),
        ));

        isSecondChildRcpCalled = true;
    });

    parentPromise.cancel();
    await expect(parentPromise).rejects.toThrow(RCPCancelError);

    expect(isSecondChildRcpCalled).toBe(false);
});

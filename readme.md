# recursive-cancelable-promise

A CancelablePromise with the ability to stop a CancelablePromise created in a CancelablePromise.
Can be created from: [CancelablePromise](https://www.npmjs.com/package/cancelable-promise).

## Install
```
npm install recursive-cancelable-promise
```
```
yarn add recursive-cancelable-promise
```

## Examples
**RecursiveCancelablePromise**
```javascript
import RecursiveCancelablePromise, { RCPController } from 'recursive-cancelable-promise';

const recursiveCancelablePromise  = 
    new RecursiveCancelablePromise(
        // try handle
        async (controller: RCPController): Promise</*type*/> => {
            // do smth

            // abort execution, if canceled
            controller.sync();

            // abort execution and do smth, if cancled
            controller.sync(() => {
                // do smth
            });
    
            // return true if canceled
            controller.isCanceled();

            // subscribe new RecursiveCancelablePromise to parent RecursiveCancelablePromise
            // if parent canceled, child will be canceled too
            // if child canceled, parent will be not canceled
            await controller.subscribe(() => new RecursiveCancelablePromise(/*...*/));
        },
        // catch handle, not required parameter
        async (controller: RCPController, error): Promise</*type*/> => {
            // error - error throwed from try handle,
            // if catch handle not specified RecursiveCancelablePromise will be rejected with error

            // do smth

            // controller identical to the controller from try handle
        },
        // do when cancel called, not required parameter
        async (): Promise<void> => {
            // do smth
        }
    );
```

**wrapCancelablePromise**
```javascript
import { wrapCancelablePromise } from 'recursive-cancelable-promise';
import CancelablePromise from 'cancelable-promise';

const recursiveCancelablePromise = wrapCancelablePromise(
        new CancelablePromise((resolve, reject, onCancel) => {
            // do smth
        }),
    );
```

***RCPCancelError***
```javascript
import RecursiveCancelablePromise, { RCPController } from 'recursive-cancelable-promise';

const recursiveCancelablePromise = new RecursiveCancelablePromise(...);

...

try {
    await recursiveCancelablePromise;
} catch(error) {
    if (error instanceof RCPCancelError) {
        // handle canceled
    }
}
```

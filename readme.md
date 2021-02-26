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
            // return RecursiveCancelablePromise
            const rcpResult = await controller.subscribe(() => new RecursiveCancelablePromise(/*...*/));
        
            // Return resolved value, or abort execution
            rcpResult.get();
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

**RecursiveCancelablePromiseResult**
```javascript
import RecursiveCancelablePromise from 'recursive-cancelable-promise';

const recursiveCancelablePromise = new RecursiveCancelablePromise(/*...*/);

// return true if canceled
recursiveCancelablePromise.isCanceled();

// Send cancel signal for controller
recursiveCancelablePromise().cancel();

// wait when recursiveCancelablePromise will be resolved
let rcpResult = await recursiveCancelablePromise();

// Send cancel signal and wait when recursiveCancelablePromise will be resolved
rcpResult = await RecursiveCancelablePromise.cancel(recursiveCancelablePromise);

// return true if canceled
rcpResult.isCanceled();

// Return resolved result, or rethrow CancelableError(abort execution), helpful in inner recursiveCancelablePromise
rcpResult.get()
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

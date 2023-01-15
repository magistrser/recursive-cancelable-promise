## [3.0.0] - 2023-01-15

Update helps prevent errors when internal RCP was cancelled but was not synced and next steps were executed
#### Previous version error example
```javascript
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
    await parentPromise;

    // isSecondChildRcpCalled will be true because child RPC was not synced
    // to sync you had to call constrooler.sync() after subscriber or
    // get the result of subscribe and call result.getSync()
```

### Added

### Changed

- RCPResult was removed, now await throw RCPCancelError

### Fixed

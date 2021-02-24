import RecursiveCancelablePromiseStopError from './RecursiveCancelablePromiseStopError';

export default interface RecursiveCancelablePromiseController {
    isStopped: () => boolean;
    sync: () => void;
}

export class _RecursiveCancelablePromiseController {
    private isStoppedFlag = false;

    stopSignal = () => {
        this.isStoppedFlag = true;
    };

    isStopped = (): boolean => this.isStoppedFlag;

    sync = () => {
        if (this.isStoppedFlag) {
            throw new RecursiveCancelablePromiseStopError();
        }
    };
}

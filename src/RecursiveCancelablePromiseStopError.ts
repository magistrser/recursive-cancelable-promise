type RecursiveCancelablePromiseExecutorTry<T> = () => Promise<T>;

export default class RecursiveCancelablePromiseStopError extends Error {}

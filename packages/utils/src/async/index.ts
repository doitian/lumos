function createTimeoutError(message?: string): Error {
  const err = new Error(message);
  err.name = "TimeoutError";
  return err;
}

/**
 * Delay for `milliseconds`
 * @param milliseconds
 */
export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * A simple {@link Promise.race} implementation,
 * to avoid incompatible Promise.race running in earlier JavaScript runtime.
 * @param promises
 */
export function race<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    promises.forEach((promise) => {
      promise.then(resolve, reject);
    });
  });
}

export interface TimeoutOptions {
  milliseconds?: number;
  message?: string | Error;
}

/**
 * Timeout a promise after `milliseconds`
 * @param promise
 * @param options
 */
export function timeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions | number = {}
): Promise<T> {
  const milliseconds: number =
    typeof options === "number" ? options : options.milliseconds ?? 1000;
  const message = typeof options === "number" ? undefined : options.message;

  const timeoutPromise = delay(milliseconds).then(() =>
    Promise.reject(
      message instanceof Error ? message : createTimeoutError(message)
    )
  );

  return race<T>([promise, timeoutPromise]);
}

export interface RetryOptions {
  retries?: number;
  timeout?: number;
  delay?: number;
}

/**
 * Retry a promise
 * @param run
 * @param options
 */
export function retry<T>(
  run: () => T | Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 10,
    timeout: timeoutMs = 1000,
    delay: delayMs = 0,
  } = options;

  let lastErr: unknown;
  let times = 0;

  const retryPromise = new Promise<T>((resolve, reject) => {
    function retryRun() {
      times++;
      if (times > retries) {
        reject(lastErr);
        return;
      }
      Promise.resolve(run()).then(resolve, (e) => {
        lastErr = e;
        delay(delayMs).then(retryRun);
      });
    }

    retryRun();
  });

  return timeout(retryPromise, { milliseconds: timeoutMs });
}

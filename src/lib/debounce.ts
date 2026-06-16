// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void;

export interface Debounced<T extends AnyFn> {
  (...args: Parameters<T>): void;
  flush(): void;
  cancel(): void;
}

export function debounce<T extends AnyFn>(fn: T, ms: number): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  function invoke() {
    if (pendingArgs !== null) {
      fn(...pendingArgs);
      pendingArgs = null;
    }
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  const debounced = function (...args: Parameters<T>) {
    pendingArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(invoke, ms);
  } as Debounced<T>;

  debounced.flush = function () {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pendingArgs !== null) {
      fn(...pendingArgs);
      pendingArgs = null;
    }
  };

  debounced.cancel = function () {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = null;
  };

  return debounced;
}

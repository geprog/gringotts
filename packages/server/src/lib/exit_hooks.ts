type CallbackFnc = () => void | Promise<void>;

const callbacks: CallbackFnc[] = [];
let isCalled = false;

function registerExitHook(): void {
  function exit(shouldManuallyExit: boolean, signal: number) {
    void (async () => {
      if (isCalled) {
        return;
      }

      isCalled = true;

      for await (const callback of callbacks) {
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        await callback();
      }

      if (shouldManuallyExit === true) {
        process.exit(128 + signal);
      }
    })();
  }

  process.once('exit', exit.bind(undefined, false, 0));
  process.once('SIGINT', exit.bind(undefined, true, 2));
  process.once('SIGTERM', exit.bind(undefined, true, 15));
}

registerExitHook();

export function addExitHook(exitHook: CallbackFnc): void {
  callbacks.push(exitHook);
}

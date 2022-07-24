// import exitHook from 'exit-hook';
import { connect, disconnect } from 'ngrok';

import { config } from '~/config';

export async function loadNgrok(): Promise<void> {
  if (process.env.NGROK_ENABLE !== 'true') {
    return;
  }

  const ngrokUrl = await connect({
    authtoken: process.env.NGROK_AUTH_TOKEN,
    addr: config.port,
  });

  function exit(shouldManuallyExit: boolean, signal: number) {
    void (async () => {
      let isCalled = false;
      if (isCalled) {
        return;
      }

      isCalled = true;

      await disconnect();

      if (shouldManuallyExit === true) {
        process.exit(128 + signal);
      }
    })();
  }

  process.once('exit', exit.bind(undefined, false, 0));
  process.once('SIGINT', exit.bind(undefined, true, 2));
  process.once('SIGTERM', exit.bind(undefined, true, 15));

  config.publicUrl = ngrokUrl;
}

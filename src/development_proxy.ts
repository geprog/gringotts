import exitHook from 'exit-hook';
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

  exitHook(() => {
    // eslint-disable-next-line no-console
    console.log('Disconnecting from ngrok ...');
    void disconnect();
  });

  config.publicUrl = ngrokUrl;
}

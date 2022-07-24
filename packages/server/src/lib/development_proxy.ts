// import exitHook from 'exit-hook';
import { connect, disconnect } from 'ngrok';

import { config } from '~/config';
import { addExitHook } from '~/lib/exit_hooks';

export async function loadNgrok(): Promise<void> {
  if (process.env.NGROK_ENABLE !== 'true') {
    return;
  }

  const ngrokUrl = await connect({
    authtoken: process.env.NGROK_AUTH_TOKEN,
    addr: config.port,
  });

  addExitHook(() => disconnect());

  config.publicUrl = ngrokUrl;
}

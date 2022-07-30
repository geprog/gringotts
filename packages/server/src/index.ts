import { init as serverInit } from '~/api';
import { checkConfig, config } from '~/config';
import { database } from '~/database';
import { loadNgrok } from '~/lib/development_proxy';
import { startLoops } from '~/loop';

async function start() {
  checkConfig();

  await loadNgrok();

  await database.init();
  await database.connect();

  startLoops();

  const server = await serverInit();

  try {
    // eslint-disable-next-line no-console
    console.log(`Starting server ${config.publicUrl} ...`);
    await server.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
}

void start();

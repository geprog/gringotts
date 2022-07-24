import { config } from '~/config';
import { database } from '~/database';
import { loadNgrok } from '~/lib/development_proxy';
import { loop } from '~/loop';
import { init as serverInit } from '~/server';

async function start() {
  await loadNgrok();

  await database.init();
  await database.connect();

  await loop();
  setInterval(() => void loop(), 1000); // TODO: increase loop time

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

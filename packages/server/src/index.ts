// import { database } from '~/database';
// import { paymentProvider } from '~/providers';
import { config } from '~/config';
import { database } from '~/database';
import { loadNgrok } from '~/development_proxy';
import { init as serverInit } from '~/server';

// async function loop() {
//   const subscriptions = await database.getChargeableSubscriptions(new Date());
//   for await (const subscription of subscriptions) {
//     await paymentProvider.chargeSubscription(period);
//     // TODO: send invoice
//     await database.putSubscription(subscription);
//   }
// }

async function start() {
  await loadNgrok();

  await database.init();

  // setInterval(() => void loop(), 1000); // TODO
  const server = await serverInit();

  try {
    // eslint-disable-next-line no-console
    console.log(`Starting server ${config.publicUrl} ...`);
    await server.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

void start();

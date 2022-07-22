// import { database } from '~/database';
// import { paymentProvider } from '~/providers';
import { server } from '~/server';

// async function loop() {
//   const subscriptions = await database.getChargeableSubscriptions(new Date());
//   for await (const subscription of subscriptions) {
//     await paymentProvider.chargeSubscription(period);
//     // TODO: send invoice
//     await database.putSubscription(subscription);
//   }
// }

async function start() {
  // setInterval(() => void loop(), 1000); // TODO

  const port = 3000;
  try {
    // eslint-disable-next-line no-console
    console.log(`Starting server http://localhost:${port} ...`);
    await server.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

void start();

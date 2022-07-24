import { database } from '~/database';
import { Subscription } from '~/entities';
import dayjs from '~/lib/dayjs';
import { getPaymentProvider } from '~/providers';

export async function getDueSubscriptions(date: Date): Promise<Subscription[]> {
  const d = dayjs(date).subtract(1, 'month').toDate();

  // check if last payment is older than a month
  const subscriptions = await database.subscriptions.find(
    {
      $and: [{ lastPayment: { $lt: d } }, { waitingForPayment: false }],
    },
    { populate: ['customer', 'changes'] },
  );

  // TODO: check if we maybe skipped one payment

  return subscriptions;
}

export async function loop(): Promise<void> {
  const paymentProvider = getPaymentProvider();
  if (!paymentProvider) {
    throw new Error('No payment provider configured');
  }

  const date = new Date();

  const subscriptions = await getDueSubscriptions(date);

  if (subscriptions.length === 0) {
    return;
  }

  // console.log('Following subscriptions need to pay again ...', subscriptions);

  for await (const subscription of subscriptions) {
    // console.log('Subscription', subscription);

    // TODO: improve locking and use some max ttl
    subscription.waitingForPayment = true;

    // TODO: send invoice
    await database.em.persistAndFlush(subscription);

    if (!subscription.lastPayment) {
      throw new Error('Subscription has no last payment');
    }

    const price = subscription.getPeriod(subscription.lastPayment).getInvoice().getPrice();
    if (price === 0) {
      // TODO: set last payment to today?
      continue;
    }

    await paymentProvider.chargeSubscription({ subscription, date: subscription.lastPayment });
  }
}

import { database } from '~/database';
import { Payment, Subscription } from '~/entities';
import dayjs from '~/lib/dayjs';
import { getPaymentProvider } from '~/payment_providers';
import { getNextPeriodFromDate } from '~/utils';

const pageSize = 10;

async function createPayment(subscription: Subscription) {
  const lastPayments = await database.payments.find(
    {
      subscription: subscription._id,
    },
    { limit: 1, orderBy: { periodEnd: 'ASC' } },
  );

  if (lastPayments.length !== 1) {
    // TODO: think about if we will really do it this way
    throw new Error('Each subscription must have at least one payment');
  }

  const lastPayment = lastPayments[0];

  const nextPeriod = getNextPeriodFromDate(lastPayment.periodEnd, subscription.anchorDate);

  const now = new Date();
  if (dayjs(nextPeriod.start).isAfter(now)) {
    return;
  }

  const lastPeriodDate = lastPayment.periodEnd; // TODO: check if this makes sense
  const price = subscription.getPeriod(lastPeriodDate).getInvoice().getPrice();

  const payment = new Payment({
    periodStart: nextPeriod.start,
    periodEnd: nextPeriod.end,
    price,
    status: 'open',
    subscription,
  });

  await database.em.persistAndFlush(payment);
}

export async function createPayments(): Promise<void> {
  const date = new Date();

  // TODO
  const d = dayjs(date).subtract(1, 'month').toDate();

  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // check if last payment is older than a month
    const subscriptions = await database.subscriptions.find(
      {
        $and: [{ lastPayment: { $lt: d } }], // TODO: improve filter
      },
      { populate: ['customer', 'changes'], limit: pageSize, offset: page * pageSize },
    );

    for await (const subscription of subscriptions) {
      await createPayment(subscription);
    }

    if (subscriptions.length < pageSize) {
      return;
    }

    page += 1;
  }
}

export async function chargeOpenPayments(): Promise<void> {
  const paymentProvider = getPaymentProvider();
  if (!paymentProvider) {
    throw new Error('No payment provider configured');
  }

  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const payments = await database.payments.find(
      {
        status: 'open',
      },
      { populate: ['subscription'], limit: pageSize, offset: page * pageSize },
    );

    for await (const payment of payments) {
      payment.status = 'pending';
      await database.em.persistAndFlush(payment);

      await paymentProvider.chargePayment({ payment });
    }

    if (payments.length < pageSize) {
      return;
    }

    page += 1;
  }
}

export function startLoops(): void {
  // create payments for pasted periods
  void createPayments();
  setInterval(() => void createPayments(), 1000); // TODO: increase loop time

  // charge open payments
  void chargeOpenPayments();
  setInterval(() => void chargeOpenPayments(), 1000); // TODO: increase loop time
}

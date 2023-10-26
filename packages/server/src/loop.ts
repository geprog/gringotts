import { database } from '~/database';
import { Invoice, InvoiceItem, Payment, SubscriptionPeriod } from '~/entities';
import dayjs from '~/lib/dayjs';
import { log } from '~/log';
import { getPaymentProvider } from '~/payment_providers';
import { getNextPeriod } from '~/utils';

const pageLimit = 10; // fetch 10 items at a time and process them

export async function chargeCustomerInvoice(invoice: Invoice): Promise<void> {
  const { customer } = invoice;
  if (!customer) {
    throw new Error(`Invoice '${invoice._id}' has no customer`);
  }

  await database.em.populate(customer, ['activePaymentMethod']);
  if (!customer.activePaymentMethod) {
    log.error({ invoiceId: invoice._id, customerId: customer._id }, 'Customer has no active payment method');
    throw new Error('Customer has no active payment method');
  }

  // add customer credit
  if (customer.balance > 0) {
    const creditAmount = Math.min(customer.balance, invoice.amount);
    invoice.items.add(
      new InvoiceItem({
        description: 'Credit',
        pricePerUnit: creditAmount * -1,
        units: 1,
      }),
    );
    customer.balance = Invoice.roundPrice(customer.balance - creditAmount);
    await database.em.persistAndFlush([customer]);
    log.debug({ customerId: customer._id, creditAmount }, 'Credit applied');
  }

  // skip negative amounts (credits) and zero amounts
  const amount = Invoice.roundPrice(invoice.totalAmount);

  const paymentDescription = `Invoice ${invoice.number}`;

  const { project } = invoice;
  if (!project) {
    throw new Error(`Project for '${customer._id}' not configured`);
  }

  const payment = new Payment({
    amount: Math.max(amount, 0), // negative amounts are not allowed
    currency: project.currency,
    customer,
    type: 'recurring',
    status: 'processing',
    description: paymentDescription,
    subscription: invoice.subscription,
  });

  invoice.payment = payment;

  if (amount > 0) {
    const paymentProvider = getPaymentProvider(project);
    if (!paymentProvider) {
      log.error({ projectId: project._id, invoiceId: invoice._id }, 'Payment provider for project not configured');
      throw new Error(`Payment provider for '${project._id}' not configured`);
    }

    await paymentProvider.chargeBackgroundPayment({ payment, project });
  } else {
    // set invoice and payment to paid immediately if the amount is 0 or negative
    invoice.status = 'paid';
    payment.status = 'paid';
    log.debug(
      { invoiceId: invoice._id, paymentId: payment._id, amount },
      'Invoice and payment set to paid as the amount is 0 or negative',
    );
  }

  await database.em.persistAndFlush([invoice, payment]);

  log.debug({ paymentId: payment._id }, 'Payment created & charged');
}

let isChargingSubscriptions = false;
export async function chargeSubscriptions(): Promise<void> {
  if (isChargingSubscriptions) {
    return;
  }
  isChargingSubscriptions = true;

  try {
    const now = new Date();

    // get due subscriptions
    const subscriptions = await database.subscriptions.find(
      // use an 1 hour buffer before creating an invoice
      { currentPeriodEnd: { $lte: dayjs(now).subtract(1, 'hour').toDate() }, status: 'active' },
      {
        limit: pageLimit,
        populate: ['project', 'changes', 'customer'],
      },
    );

    for await (const subscription of subscriptions) {
      subscription.status = 'processing';
      await database.em.persistAndFlush([subscription]);

      const { project, customer } = subscription;

      const billingPeriod = { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd };

      try {
        const existingInvoices = await database.invoices.find({
          date: { $gte: billingPeriod.start, $lte: billingPeriod.end },
          subscription,
        });
        if (existingInvoices.length > 0) {
          log.error(
            { subscriptionId: subscription._id, customerId: customer._id },
            'Invoice for period already exists',
          );
          // TODO: should we just ignore this? currently this sets the subscription to error state?
          throw new Error('Invoice for period already exists');
        }

        customer.invoiceCounter += 1;

        const invoice = new Invoice({
          currency: project.currency,
          vatRate: project.vatRate,
          sequentialId: customer.invoiceCounter,
          subscription,
          project,
          status: 'pending',
          date: new Date(),
        });

        const period = new SubscriptionPeriod(subscription, billingPeriod.start, billingPeriod.end);
        period.getInvoiceItems().forEach((item) => {
          invoice.items.add(item);
        });

        const nextPeriod = getNextPeriod(billingPeriod.start, subscription.anchorDate);
        subscription.currentPeriodStart = nextPeriod.start;
        subscription.currentPeriodEnd = nextPeriod.end;
        subscription.status = 'active';

        await database.em.persistAndFlush([subscription, customer, invoice]);

        log.debug(
          {
            customerId: customer._id,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            subscriptionId: subscription._id,
            invoiceCounter: customer.invoiceCounter,
          },
          'Subscription charged & invoiced',
        );
      } catch (e) {
        log.error('Error while subscription charging:', e);
        subscription.status = 'error';
        subscription.error = (e as Error)?.message || (e as string);
        await database.em.persistAndFlush([subscription]);
      }
    }
  } catch (e) {
    log.error(e, 'An error occurred while charging subscriptions');
  }

  isChargingSubscriptions = false;
}

let isChargingPendingInvoices = false;
export async function chargePendingInvoices(): Promise<void> {
  if (isChargingPendingInvoices) {
    return;
  }

  isChargingPendingInvoices = true;

  try {
    const invoices = await database.invoices.find(
      { status: 'pending', payment: null },
      {
        limit: pageLimit,
        populate: ['project', 'payment', 'subscription', 'customer'],
      },
    );

    for await (const invoice of invoices) {
      invoice.status = 'processing';
      await database.em.persistAndFlush([invoice]);

      await chargeCustomerInvoice(invoice);
    }
  } catch (e) {
    log.error(e, 'An error occurred while charging invoices');
  }

  isChargingPendingInvoices = false;
}

export function startLoops(): void {
  const loopInterval = 1000 * 1; // TODO: increase loop time
  setInterval(() => void chargeSubscriptions(), loopInterval);
  setInterval(() => void chargePendingInvoices(), loopInterval);
}

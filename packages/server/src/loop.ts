import { database } from '~/database';
import { Customer, Invoice, InvoiceItem, Payment, SubscriptionPeriod } from '~/entities';
import dayjs from '~/lib/dayjs';
import { log } from '~/log';
import { getPaymentProvider } from '~/payment_providers';
import { getPeriodFromAnchorDate } from '~/utils';

const pageSize = 10;

export async function chargeCustomerInvoice({
  billingPeriod,
  customer,
  invoice,
}: {
  billingPeriod: { start: Date; end: Date };
  customer: Customer;
  invoice: Invoice;
}): Promise<void> {
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
  if (amount <= 0) {
    invoice.status = 'paid';
    log.debug({ invoiceId: invoice._id, amount }, 'Invoice set to paid as the amount is 0 or negative');
    // TODO: should we create a fake payment?
    await database.em.persistAndFlush([invoice]);
    return;
  }

  let paymentDescription = `Invoice ${invoice.number}`;

  const { subscription } = invoice;
  if (subscription) {
    const formatDate = (d: Date) => dayjs(d).format('DD.MM.YYYY');
    paymentDescription = `Subscription for period ${formatDate(billingPeriod.start)} - ${formatDate(
      billingPeriod.end,
    )}`; // TODO: think about text
    log.debug({ subscriptionId: subscription._id, paymentDescription }, 'Subscription payment');
  }

  const { project } = customer;
  if (!project) {
    log.error({ subscriptionId: subscription._id, paymentDescription }, 'Subscription payment');
    throw new Error(`Project for '${customer._id}' not configured`);
  }

  const payment = new Payment({
    amount,
    currency: project.currency,
    customer,
    type: 'recurring',
    status: 'pending',
    description: paymentDescription,
    subscription,
  });

  invoice.status = 'pending';
  invoice.payment = payment;

  const paymentProvider = getPaymentProvider(project);
  if (!paymentProvider) {
    log.error({ projectId: project._id, invoiceId: invoice._id }, 'Payment provider for project not configured');
    throw new Error(`Payment provider for '${project._id}' not configured`);
  }

  await paymentProvider.chargeBackgroundPayment({ payment, project });
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
    let page = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // get due subscriptions
      const subscriptions = await database.subscriptions.find(
        { nextPayment: { $lte: now }, status: 'active' },
        {
          limit: pageSize,
          offset: page * pageSize,
          populate: ['project', 'changes', 'customer'],
        },
      );

      for await (const subscription of subscriptions) {
        // TODO: should we lock subscription processing?

        const { project, customer } = subscription;

        const billingPeriod = getPeriodFromAnchorDate(subscription.nextPayment, subscription.anchorDate);

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
            status: 'draft',
            date: billingPeriod.end, // TODO: or has this to be the current date when the invoice is issued?
          });

          const period = new SubscriptionPeriod(subscription, billingPeriod.start, billingPeriod.end);
          period.getInvoiceItems().forEach((item) => {
            invoice.items.add(item);
          });

          await database.em.persistAndFlush([customer, invoice]);

          await chargeCustomerInvoice({ billingPeriod, customer, invoice });

          const nextPeriod = getPeriodFromAnchorDate(
            dayjs(subscription.nextPayment).add(1, 'day').toDate(),
            subscription.anchorDate,
          );
          subscription.nextPayment = nextPeriod.end;
          await database.em.persistAndFlush([subscription]);

          log.debug(
            {
              customerId: customer._id,
              nextPayment: subscription.nextPayment,
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

      if (subscriptions.length < pageSize) {
        break;
      }

      page += 1;
    }
  } catch (e) {
    log.error(e, 'An error occurred while charging subscriptions');
  }

  isChargingSubscriptions = false;
}

export function startLoops(): void {
  // charge subscriptions for past periods
  void chargeSubscriptions();
  setInterval(() => void chargeSubscriptions(), 1000); // TODO: increase loop time
}

import { database } from '~/database';
import { Customer, Invoice, InvoiceItem, Payment, Subscription, SubscriptionPeriod, Task } from '~/entities';
import dayjs from '~/lib/dayjs';
import { log } from '~/log';
import { getPaymentProvider } from '~/payment_providers';
import { getPeriodFromAnchorDate } from '~/utils';

type ChargeSubscriptionTaskData = {
  subscriptionId: string;
};

function getBillingPeriod(subscription: Subscription, invoice: Invoice) {
  return getPeriodFromAnchorDate(dayjs(invoice.date).subtract(1, 'day').toDate(), subscription.anchorDate);
}

function addSubscriptionChangesToInvoice<T extends Invoice>(subscription: Subscription, invoice: T): T {
  const billingPeriod = getBillingPeriod(subscription, invoice);
  const period = new SubscriptionPeriod(subscription, billingPeriod.start, billingPeriod.end);
  const newInvoiceItems = period.getInvoiceItems();

  // TODO: check if invoice items are already in the invoice

  newInvoiceItems.forEach((item) => {
    invoice.items.add(item);
  });

  return invoice;
}

export async function chargeCustomerInvoice({
  customer,
  invoice,
}: {
  customer: Customer;
  invoice: Invoice;
}): Promise<void> {
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
  if (amount > 0) {
    let paymentDescription = `Invoice ${invoice.number}`;

    const { subscription } = invoice;
    if (subscription) {
      const formatDate = (d: Date) => dayjs(d).format('DD.MM.YYYY');
      const billingPeriod = getBillingPeriod(subscription, invoice);
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

    invoice.payment = payment;

    const paymentProvider = getPaymentProvider(project);
    if (!paymentProvider) {
      log.error({ projectId: project._id, invoiceId: invoice._id }, 'Payment provider for project not configured');
      throw new Error(`Payment provider for '${project._id}' not configured`);
    }

    await paymentProvider.chargeBackgroundPayment({ payment, project });
    await database.em.persistAndFlush([payment]);
    log.debug({ paymentId: payment._id }, 'Payment created & charged');
  } else {
    invoice.status = 'paid';
    log.debug({ invoiceId: invoice._id, amount }, 'Invoice set to paid as the amount is 0 or negative');
    // TODO: should we create a fake payment?
  }

  await database.em.persistAndFlush([invoice]);
}

export async function chargeSubscription(task: Task): Promise<void> {
  const { subscriptionId } = task.data as ChargeSubscriptionTaskData;

  const subscription = await database.subscriptions.findOneOrFail(subscriptionId, {
    populate: ['customer'],
  });

  const { customer } = subscription;
  const { project } = task;

  let invoice = new Invoice({
    date: new Date(),
    status: 'pending',
    subscription,
    currency: project.currency,
    vatRate: project.vatRate,
    project,
  });

  try {
    await database.em.populate(customer, ['activePaymentMethod']);
    if (!customer.activePaymentMethod) {
      log.error({ invoiceId: invoice._id, customerId: customer._id }, 'Customer has no active payment method');
      throw new Error('Customer has no active payment method');
    }

    invoice = addSubscriptionChangesToInvoice(subscription, invoice);
    customer.invoiceCounter += 1;
    await chargeCustomerInvoice({ customer, invoice });
  } catch (e) {
    log.error('Error while invoice charging:', e);
  }

  const nextPeriod = getPeriodFromAnchorDate(invoice.date, subscription.anchorDate);
  const newTask = new Task({
    type: 'charge_subscription',
    data: {
      invoiceId: invoice._id,
    },
    executeAt: nextPeriod.end,
  });

  await database.em.persistAndFlush([customer, newTask]);
  log.debug(
    {
      customerId: customer._id,
      invoiceId: invoice._id,
      invoiceDate: invoice.date,
      nextInvoiceDate: nextPeriod.end,
      subscriptionId: subscription._id,
      invoiceCounter: customer.invoiceCounter,
    },
    'New task created',
  );
}

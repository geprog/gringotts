import { database } from '~/database';
import { Customer, Invoice, InvoiceItem, Payment, Subscription, SubscriptionPeriod } from '~/entities';
import dayjs from '~/lib/dayjs';
import { getPaymentProvider } from '~/payment_providers';
import { getPeriodFromAnchorDate } from '~/utils';

const pageSize = 10;

function getBillingPeriod(subscription: Subscription, invoice: Invoice) {
  return getPeriodFromAnchorDate(dayjs(invoice.date).subtract(1, 'day').toDate(), subscription.anchorDate);
}

export async function chargeCustomerInvoice({
  customer,
  invoice,
}: {
  customer: Customer;
  invoice: Invoice;
}): Promise<void> {
  console.log('totalAmount', invoice.totalAmount);

  if (customer.balance > 0) {
    const creditAmount = Math.min(customer.balance, invoice.totalAmount);
    invoice.items.add(
      new InvoiceItem({
        description: 'Credit',
        pricePerUnit: creditAmount * -1,
        units: 1,
      }),
    );
    console.log('customer.balance', customer.balance);
    console.log('creditAmount', creditAmount);
    customer.balance = Invoice.roundPrice(customer.balance - creditAmount);
    console.log('customer.balance', customer.balance);
    await database.em.persistAndFlush([customer]);
  }

  // skip negative amounts (credits) and zero amounts
  const amount = Invoice.roundPrice(invoice.totalAmount);
  console.log('totalAmount', invoice.totalAmount);
  if (amount > 0) {
    let paymentDescription = `Invoice ${invoice.number}`;

    const { subscription } = invoice;
    if (subscription) {
      const formatDate = (d: Date) => dayjs(d).format('DD.MM.YYYY');
      const billingPeriod = getBillingPeriod(subscription, invoice);
      paymentDescription = `Subscription for period ${formatDate(billingPeriod.start)} - ${formatDate(
        billingPeriod.end,
      )}`; // TODO: think about text
    }

    const payment = new Payment({
      amount,
      currency: 'EUR', // TODO: allow to configure currency
      customer,
      type: 'recurring',
      status: 'pending',
      description: paymentDescription,
      subscription,
    });

    invoice.payment = payment;

    const { project } = customer;
    if (!project) {
      throw new Error(`Project for '${customer._id}' not configured`);
    }

    const paymentProvider = getPaymentProvider(project);
    if (!paymentProvider) {
      throw new Error(`Payment provider for '${project._id}' not configured`);
    }

    await paymentProvider.chargeBackgroundPayment({ payment, project });
    await database.em.persistAndFlush([payment]);
  } else {
    invoice.status = 'paid';
    // TODO: should we create a fake payment?
  }

  customer.invoiceCounter += 1;
  await database.em.persistAndFlush([customer, invoice]);
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

let isCharging = false;

export async function chargeInvoices(): Promise<void> {
  if (isCharging) {
    return;
  }
  isCharging = true;

  try {
    const now = new Date();

    let page = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // get draft invoice from past periods
      const invoices = await database.invoices.find(
        { date: { $lte: now }, status: 'draft' },
        {
          limit: pageSize,
          offset: page * pageSize,
          populate: ['project', 'items', 'subscription.changes', 'subscription.customer'],
        },
      );

      for await (let invoice of invoices) {
        // Lock invoice processing
        invoice.status = 'pending';
        await database.em.persistAndFlush(invoice);

        const { project, subscription } = invoice;
        if (!subscription) {
          throw new Error('Invoice has no subscription');
        }

        invoice = addSubscriptionChangesToInvoice(subscription, invoice);

        const { customer } = subscription;
        await database.em.populate(customer, ['activePaymentMethod']);
        if (!customer.activePaymentMethod) {
          throw new Error('Customer has no active payment method');
        }

        await chargeCustomerInvoice({ customer, invoice });

        const nextPeriod = getPeriodFromAnchorDate(invoice.date, subscription.anchorDate);
        const newInvoice = new Invoice({
          date: nextPeriod.end,
          sequentialId: customer.invoiceCounter,
          status: 'draft',
          subscription,
          currency: 'EUR', // TODO: allow to configure currency
          vatRate: 19.0, // TODO: german vat rate => allow to configure
          project,
        });

        await database.em.persistAndFlush([newInvoice]);
      }

      if (invoices.length < pageSize) {
        break;
      }

      page += 1;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error in loop:', e);
  }

  isCharging = false;
}

export function startLoops(): void {
  // charge invoices for past periods
  void chargeInvoices();
  setInterval(() => void chargeInvoices(), 1000); // TODO: increase loop time
}

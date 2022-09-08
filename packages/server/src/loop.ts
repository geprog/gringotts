import { database } from '~/database';
import { Invoice, InvoiceItem, Payment, Subscription, SubscriptionPeriod } from '~/entities';
import dayjs from '~/lib/dayjs';
import { getPaymentProvider } from '~/payment_providers';
import { getNextPeriodFromDate } from '~/utils';

const pageSize = 10;

export function addSubscriptionChangesToInvoice(subscription: Subscription, invoice: Invoice): Invoice {
  const period = new SubscriptionPeriod(subscription, invoice.start, invoice.end);

  const newInvoiceItems = period.getInvoiceItems();

  // TODO: check if invoice items are already in the invoice

  invoice.items.add(...newInvoiceItems);

  return invoice;
}

export async function chargeInvoices(): Promise<void> {
  const now = new Date();

  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // get draft invoice from past periods
    const invoices = await database.invoices.find(
      { end: { $lt: now }, status: 'draft' },
      { limit: pageSize, offset: page * pageSize, populate: ['project'] },
    );

    for await (let invoice of invoices) {
      // Lock invoice processing
      invoice.status = 'pending';
      await database.em.persistAndFlush(invoice);

      const { project } = invoice;

      const subscription = invoice.subscription;
      if (!subscription) {
        throw new Error('Invoice has no subscription');
      }

      await database.em.populate(subscription, ['changes']);
      invoice = addSubscriptionChangesToInvoice(subscription, invoice);

      const amount = Invoice.roundPrice(invoice.totalAmount);

      // skip negative prices (credits) and zero prices
      if (amount > 0) {
        const formatDate = (d: Date) => dayjs(d).format('DD.MM.YYYY');
        const paymentDescription = `Subscription for period ${formatDate(invoice.start)} - ${formatDate(invoice.end)}`; // TODO: think about text

        const payment = new Payment({
          amount,
          currency: 'EUR',
          customer: subscription.customer,
          status: 'pending',
          description: paymentDescription,
          subscription,
        });

        invoice.payment = payment;

        const paymentProvider = getPaymentProvider(project);
        if (!paymentProvider) {
          throw new Error(`Payment provider for '${project._id}' not configured`);
        }

        await paymentProvider.chargePayment({ payment, project });
        await database.em.persistAndFlush([payment, invoice]);
      }

      const nextPeriod = getNextPeriodFromDate(invoice.end, invoice.start);

      const customer = subscription.customer;
      customer.invoiceCounter += 1;

      const newInvoice = new Invoice({
        start: nextPeriod.start,
        end: nextPeriod.end,
        sequentialId: customer.invoiceCounter,
        status: 'draft',
        subscription,
        currency: 'EUR', // TODO: allow to configure currency
        vatRate: 19.0, // TODO: german vat rate => allow to configure
        project,
      });

      // if price is negative add credit to next invoice
      if (amount < 0) {
        newInvoice.items.add(
          new InvoiceItem({
            description: 'Credit from last payment', // TODO: think about text
            pricePerUnit: amount,
            units: 1,
            invoice: newInvoice,
          }),
        );
      }

      await database.em.persistAndFlush([newInvoice, customer]);
    }

    if (invoices.length < pageSize) {
      return;
    }

    page += 1;
  }
}

export function startLoops(): void {
  // charge invoices for past periods
  void chargeInvoices();
  setInterval(() => void chargeInvoices(), 1000); // TODO: increase loop time
}

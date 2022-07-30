import { database } from '~/database';
import { Invoice, InvoiceItem, Payment, Subscription } from '~/entities';
import dayjs from '~/lib/dayjs';
import { getPaymentProvider } from '~/payment_providers';
import { getNextPeriodFromDate } from '~/utils';

const pageSize = 10;

function getPriceForInvoiceItem(item: InvoiceItem): number {
  const basePrice = item.pricePerUnit * item.units;
  const start = dayjs(item.start);
  const end = dayjs(item.end);
  const itemDiff = dayjs(start).diff(end);
  const invoiceDiff = dayjs(this.start).diff(this.end);
  return (basePrice / invoiceDiff) * itemDiff;
}

export async function addSubscriptionChangesToInvoice(subscription: Subscription, invoice: Invoice): Promise<Invoice> {
  // TODO: add missing subscription changes to invoice

  return invoice;
}

export async function chargeInvoices(): Promise<void> {
  const now = new Date();

  const paymentProvider = getPaymentProvider();
  if (!paymentProvider) {
    throw new Error('Payment provider not configured');
  }

  let page = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // check if last payment is older than a month
    const invoices = await database.invoices.find(
      { end: { $lt: now }, status: 'open' },
      { limit: pageSize, offset: page * pageSize },
    );

    for await (let invoice of invoices) {
      // Lock invoice processing
      invoice.status = 'pending';
      await database.em.persistAndFlush(invoice);

      const subscription = invoice.subscription;
      if (!subscription) {
        throw new Error('Invoice has no subscription');
      }
      invoice = await addSubscriptionChangesToInvoice(subscription, invoice);

      const price = invoice.getPrice();

      // skip negative prices (credits) and zero prices
      if (price > 0) {
        const payment = new Payment({
          price,
          currency: 'EUR',
          invoice,
          status: 'pending',
        });
        await paymentProvider.chargePayment({ payment });
        await database.em.persistAndFlush(payment);
      }

      const nextPeriod = getNextPeriodFromDate(invoice.end, invoice.start);

      const newInvoice = new Invoice({
        status: 'draft',
        start: nextPeriod.start,
        end: nextPeriod.end,
      });

      // if price is negative add credit to next invoice
      if (price < 0) {
        newInvoice.items.add(
          new InvoiceItem({
            description: 'Credit from last payment',
            pricePerUnit: price,
            units: 1,
            invoice: newInvoice,
          }),
        );
      }

      await database.em.persistAndFlush(newInvoice);
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
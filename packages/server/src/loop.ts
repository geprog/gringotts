import { database } from '~/database';
import { Customer, Invoice, InvoiceItem, Payment, Subscription, SubscriptionPeriod } from '~/entities';
import dayjs from '~/lib/dayjs';
import { log } from '~/log';
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
          log.error({ invoiceId: invoice._id }, 'Invoice has no subscription');
          throw new Error('Invoice has no subscription');
        }

        const { customer } = subscription;

        try {
          await database.em.populate(customer, ['activePaymentMethod']);
          if (!customer.activePaymentMethod) {
            log.error({ invoiceId: invoice._id, customerId: customer._id }, 'Customer has no active payment method');
            throw new Error('Customer has no active payment method');
          }

          invoice = addSubscriptionChangesToInvoice(subscription, invoice);
          await chargeCustomerInvoice({ customer, invoice });
        } catch (e) {
          log.error('Error while invoice charging:', e);
        }

        const nextPeriod = getPeriodFromAnchorDate(invoice.date, subscription.anchorDate);
        customer.invoiceCounter += 1;
        const newInvoice = new Invoice({
          date: nextPeriod.end,
          sequentialId: customer.invoiceCounter,
          status: 'draft',
          subscription,
          currency: project.currency,
          vatRate: project.vatRate,
          project,
        });

        await database.em.persistAndFlush([customer, newInvoice]);
        log.debug(
          {
            customerId: customer._id,
            invoiceId: newInvoice._id,
            invoiceDate: nextPeriod.end,
            subscriptionId: subscription._id,
            invoiceCounter: customer.invoiceCounter,
          },
          'New invoice created',
        );
      }

      if (invoices.length < pageSize) {
        break;
      }

      page += 1;
    }
  } catch (e) {
    log.error(e, 'An error occurred while charging invoices');
  }

  isCharging = false;
}

export function startLoops(): void {
  // charge invoices for past periods
  void chargeInvoices();
  setInterval(() => void chargeInvoices(), 1000); // TODO: increase loop time
}

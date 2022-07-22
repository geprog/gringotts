import { createMollieClient, Customer, MollieClient, PaymentStatus, SequenceType } from '@mollie/api-client';

import { formatDate } from '~/lib/dayjs';
import { PaymentProvider } from '~/providers/types';
import { Subscription } from '~/types/subscription';

export class Mollie implements PaymentProvider {
  api: MollieClient;
  webhookUrl: string;

  constructor({ apiKey, webhookUrl }: { apiKey: string; webhookUrl: string }) {
    this.api = createMollieClient({ apiKey });
    this.webhookUrl = webhookUrl;
  }

  async startSubscription({
    subscription,
    redirectUrl,
    pricePerUnit,
    units,
  }: {
    subscription: Subscription;
    redirectUrl: string;
    pricePerUnit: number;
    units: number;
  }): Promise<{ subscription: Subscription; checkoutUrl: string }> {
    let customer: Customer;
    if (subscription?.customer?.id) {
      customer = await this.api.customers.get(subscription?.customer?.id);
    } else {
      customer = await this.api.customers.create({
        name: subscription?.customer?.name,
        email: subscription?.customer?.email,
      });
    }

    const customerId = customer.id;

    // const paymentDescription = `Upgrade ${space.name} to '${spacePlanType}'`;
    const paymentDescription = `Get the best product on earth`;

    const payment = await this.api.payments.create({
      amount: {
        value: '0.00', // TODO think about correct starting price
        currency: 'EUR',
      },
      customerId,
      description: paymentDescription,
      sequenceType: SequenceType.first,
      redirectUrl,
      webhookUrl: this.webhookUrl,
      metadata: {
        objectId: subscription.objectId,
        units,
        pricePerUnit,
      },
    });

    const checkoutUrl = payment._links.checkout?.href;
    if (!checkoutUrl) {
      throw new Error('No checkout url received');
    }

    return {
      checkoutUrl,
      subscription,
    };
  }

  async chargeSubscription(subscription: Subscription, date: Date): Promise<void> {
    if (!subscription?.customer?.id) {
      throw new Error('No customer id');
    }
    const customer = await this.api.customers.get(subscription.customer.id);

    const period = subscription.getPeriod(date);
    const invoice = period.getInvoice();

    const paymentDescription = `Charge ${formatDate(period.start)} - ${formatDate(period.end)}`;

    const payment = await this.api.payments.create({
      amount: {
        value: this.priceToMolliePrice(invoice.getPrice()),
        currency: 'EUR',
      },
      customerId: customer.id,
      description: paymentDescription,
      sequenceType: SequenceType.recurring,
      metadata: {
        subscriptionId: subscription._id,
        period: {
          start: period.start,
          end: period.end,
        },
      },
    });

    if (payment.status !== PaymentStatus.paid) {
      throw new Error('Payment failed');
    }
  }

  priceToMolliePrice(price: number): string {
    return `${Math.round(price * 100) / 100}`;
  }
}

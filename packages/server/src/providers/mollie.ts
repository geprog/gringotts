import { createMollieClient, Customer, MollieClient, PaymentStatus, SequenceType } from '@mollie/api-client';

import { config } from '~/config';
import { Subscription } from '~/entities';
import { formatDate } from '~/lib/dayjs';
import { PaymentProvider } from '~/providers/types';

type Metadata = {
  subscriptionId: string;
  period?: {
    start: string;
    end: string;
  };
  plan?: {
    pricePerUnit: number;
    units: number;
  };
};

export class Mollie implements PaymentProvider {
  api: MollieClient;

  constructor({ apiKey }: { apiKey: string }) {
    if (!apiKey) {
      throw new Error('No api key');
    }

    this.api = createMollieClient({ apiKey });
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
    customer: Customer;
  }): Promise<{ checkoutUrl: string }> {
    const customer = await this.api.customers.get(subscription.customer.paymentProviderId);

    // TODO
    const paymentDescription = `Initial charge`;

    const payment = await this.api.payments.create({
      amount: {
        value: '0.00', // TODO think about correct starting price
        currency: 'EUR',
      },
      customerId: customer.id,
      description: paymentDescription,
      sequenceType: SequenceType.first,
      redirectUrl,
      webhookUrl: `${config.publicUrl}${config.webhookUrl}`,
      metadata: <Metadata>{
        subscriptionId: subscription._id,
        plan: {
          units,
          pricePerUnit,
        },
      },
    });

    const checkoutUrl = payment._links.checkout?.href;
    if (!checkoutUrl) {
      throw new Error('No checkout url received');
    }

    return { checkoutUrl };
  }

  async chargeSubscription(subscription: Subscription, date: Date): Promise<void> {
    if (!subscription.customer.paymentProviderId) {
      throw new Error('No customer id');
    }
    const customer = await this.api.customers.get(subscription.customer.paymentProviderId);

    const period = subscription.getPeriod(date);
    const invoice = period.getInvoice();

    // TODO
    const paymentDescription = `Charge ${formatDate(period.start)} - ${formatDate(period.end)}`;

    const payment = await this.api.payments.create({
      amount: {
        value: this.priceToMolliePrice(invoice.getPrice()),
        currency: 'EUR',
      },
      customerId: customer.id,
      description: paymentDescription,
      sequenceType: SequenceType.recurring,
      metadata: <Metadata>{
        subscriptionId: subscription._id,
        period: {
          start: period.start.toJSON(),
          end: period.end.toJSON(),
        },
      },
    });

    if (payment.status !== PaymentStatus.paid) {
      throw new Error('Payment failed');
    }
  }

  async parsePaymentWebhook(payload: unknown): Promise<{ subscriptionId: string; paidAt: Date }> {
    const { id: paymentId } = payload as { id: string };

    const payment = await this.api.payments.get(paymentId);
    if (payment.status !== PaymentStatus.paid) {
      throw new Error('Payment not paid');
    }

    const metadata = payment.metadata as Metadata;

    if (!payment.paidAt) {
      throw new Error('No paidAt');
    }

    return {
      paidAt: new Date(payment.paidAt),
      subscriptionId: metadata.subscriptionId,
    };
  }

  private priceToMolliePrice(price: number): string {
    return `${Math.round(price * 100) / 100}`;
  }
}

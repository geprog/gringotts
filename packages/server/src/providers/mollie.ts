import { createMollieClient, MollieClient, PaymentStatus, SequenceType } from '@mollie/api-client';

import { config } from '~/config';
import { Customer, Subscription } from '~/entities';
import dayjs from '~/lib/dayjs';
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
        currency: 'EUR', // TODO get currency from config
      },
      customerId: customer.id,
      description: paymentDescription,
      sequenceType: SequenceType.first,
      redirectUrl,
      webhookUrl: `${config.publicUrl}/payment/webhook`,
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

  async chargeSubscription({ subscription, date }: { subscription: Subscription; date: Date }): Promise<void> {
    if (!subscription.customer.paymentProviderId) {
      throw new Error('No customer id');
    }
    const customer = await this.api.customers.get(subscription.customer.paymentProviderId);

    const period = subscription.getPeriod(date);
    const invoice = period.getInvoice();

    // TODO
    const formatDate = (d: Date) => dayjs(d).format('DD.MM.YYYY');
    const paymentDescription = `Subscription for period ${formatDate(period.start)} - ${formatDate(period.end)}`;
    const price = invoice.getPrice();

    await this.api.payments.create({
      amount: {
        value: this.priceToMolliePrice(price),
        currency: 'EUR', // TODO get currency from config
      },
      customerId: customer.id,
      description: paymentDescription,
      sequenceType: SequenceType.recurring,
      webhookUrl: `${config.publicUrl}/payment/webhook`,
      metadata: <Metadata>{
        subscriptionId: subscription._id,
        period: {
          start: period.start.toJSON(),
          end: period.end.toJSON(),
        },
      },
    });
  }

  async parsePaymentWebhook(payload: unknown): Promise<{ subscriptionId: string; paidAt: Date; paid: boolean }> {
    const { id: paymentId } = payload as { id: string };

    const payment = await this.api.payments.get(paymentId);

    const metadata = payment.metadata as Metadata;
    if (!payment.paidAt) {
      throw new Error('No paidAt');
    }

    return {
      paid: payment.status === PaymentStatus.paid,
      paidAt: new Date(payment.paidAt),
      subscriptionId: metadata.subscriptionId,
    };
  }

  async createCustomer(customer: Customer): Promise<Customer> {
    const mollieCustomer = await this.api.customers.create({
      name: customer.name,
      email: customer.email,
    });

    customer.paymentProviderId = mollieCustomer.id;

    return customer;
  }

  async updateCustomer(customer: Customer): Promise<Customer> {
    const mollieCustomer = await this.api.customers.update(customer.paymentProviderId, {
      name: customer.name,
      email: customer.email,
    });

    customer.paymentProviderId = mollieCustomer.id;

    return customer;
  }

  async deleteCustomer(customer: Customer): Promise<void> {
    await this.api.customers.delete(customer.paymentProviderId);
  }

  private priceToMolliePrice(price: number): string {
    return `${(Math.round(price * 100) / 100).toFixed(2)}`;
  }
}

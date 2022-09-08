import { createMollieClient, MollieClient, PaymentStatus, SequenceType } from '@mollie/api-client';

import { config } from '~/config';
import { Customer, Payment, Project, Subscription } from '~/entities';
import { PaymentProvider } from '~/payment_providers/types';

type Metadata = {
  paymentId: string;
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
    project,
    redirectUrl,
    payment,
  }: {
    project: Project;
    subscription: Subscription;
    redirectUrl: string;
    payment: Payment;
  }): Promise<{ checkoutUrl: string }> {
    const customer = await this.api.customers.get(payment.customer.paymentProviderId);

    const _payment = await this.api.payments.create({
      amount: {
        value: this.priceToMolliePrice(payment.amount),
        currency: payment.currency,
      },
      customerId: customer.id,
      description: payment.description,
      sequenceType: SequenceType.first,
      redirectUrl,
      webhookUrl: `${config.publicUrl}/payment/webhook/${project._id}`,
      metadata: <Metadata>{
        paymentId: payment._id,
      },
    });

    const checkoutUrl = _payment._links.checkout?.href;
    if (!checkoutUrl) {
      throw new Error('No checkout url received');
    }

    return { checkoutUrl };
  }

  async chargePayment({ payment, project }: { payment: Payment; project: Project }): Promise<void> {
    if (!payment.customer.paymentProviderId) {
      throw new Error('No customer id');
    }
    const customer = await this.api.customers.get(payment.customer.paymentProviderId);

    await this.api.payments.create({
      amount: {
        value: this.priceToMolliePrice(payment.amount),
        currency: payment.currency,
      },
      customerId: customer.id,
      description: payment.description,
      sequenceType: SequenceType.recurring,
      webhookUrl: `${config.publicUrl}/payment/webhook/${project._id}`,
      metadata: <Metadata>{
        paymentId: payment._id,
      },
    });
  }

  private convertPaymentStatus(paymentStatus: PaymentStatus) {
    // TODO: check meaning of authorized
    if (paymentStatus === PaymentStatus.paid || paymentStatus === PaymentStatus.authorized) {
      return 'paid';
    }

    if (
      paymentStatus === PaymentStatus.failed ||
      paymentStatus === PaymentStatus.expired ||
      paymentStatus === PaymentStatus.canceled
    ) {
      return 'failed';
    }

    return 'pending';
  }

  async parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date | undefined; paymentStatus: 'pending' | 'paid' | 'failed' }> {
    const _payload = payload as { id: string };

    const payment = await this.api.payments.get(_payload?.id);

    const metadata = payment.metadata as Metadata;

    return {
      paymentStatus: this.convertPaymentStatus(payment.status),
      paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
      paymentId: metadata.paymentId,
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

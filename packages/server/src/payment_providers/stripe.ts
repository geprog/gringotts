import StripeApi from 'stripe';

import { Customer, Payment, Project, Subscription } from '~/entities';
import { PaymentProvider } from '~/payment_providers/types';

export class Stripe implements PaymentProvider {
  api: StripeApi;

  constructor({ apiKey }: { apiKey: string }) {
    if (!apiKey) {
      throw new Error('No api key');
    }

    this.api = new StripeApi(apiKey, {});
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
    // TODO
    const checkoutUrl = '';

    return { checkoutUrl };
  }

  async chargePayment({ payment, project }: { payment: Payment; project: Project }): Promise<void> {
    // TODO
  }

  async parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date | undefined; paymentStatus: 'pending' | 'paid' | 'failed' }> {
    // TODO
    return {
      paymentStatus: 'failed',
      paidAt: undefined,
      paymentId: 'todo',
    };
  }

  async createCustomer(customer: Customer): Promise<Customer> {
    // TODO
    return customer;
  }

  async updateCustomer(customer: Customer): Promise<Customer> {
    // TODO
    return customer;
  }

  async deleteCustomer(customer: Customer): Promise<void> {
    // TODO
  }
}

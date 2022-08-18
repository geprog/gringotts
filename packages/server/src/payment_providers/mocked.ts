import { Customer, Payment, Subscription } from '~/entities';
import { PaymentProvider } from '~/payment_providers/types';

export let customers: Customer[] = [];
export const payments: { paymentId: string; status: string; customerId: string }[] = [];

export class Mocked implements PaymentProvider {
  // eslint-disable-next-line @typescript-eslint/require-await
  async startSubscription({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    redirectUrl,
    payment,
  }: {
    subscription: Subscription;
    redirectUrl: string;
    payment: Payment;
  }): Promise<{ checkoutUrl: string }> {
    const customer = customers.find((c) => c._id === payment.customer._id);
    if (!customer) {
      throw new Error('No customer');
    }

    payments.push({
      paymentId: payment._id,
      customerId: customer?._id,
      status: 'pending',
    });

    const checkoutUrl = 'http://localhost:3000/checkout';

    return { checkoutUrl };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async chargePayment(payment: Payment): Promise<void> {
    const customer = customers.find((c) => c._id === payment.customer._id);
    if (!customer) {
      throw new Error('No customer');
    }

    payments.push({
      paymentId: payment._id,
      customerId: customer?._id,
      status: 'pending',
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date | undefined; paymentStatus: 'pending' | 'paid' | 'failed' }> {
    const { id: paymentId } = payload as { id: string };

    return {
      paymentStatus: 'paid',
      paidAt: new Date(),
      paymentId,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async createCustomer(customer: Customer): Promise<Customer> {
    customers.push(customer);

    return customer;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateCustomer(customer: Customer): Promise<Customer> {
    customers = customers.map((c) => (c._id === customer._id ? customer : c));
    return customer;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async deleteCustomer(customer: Customer): Promise<void> {
    customers = customers.filter((c) => c._id !== customer._id);
  }
}

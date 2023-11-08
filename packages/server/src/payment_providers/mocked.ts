import { config } from '~/config';
import { Customer, Payment, PaymentMethod, Project } from '~/entities';
import { PaymentProvider } from '~/payment_providers/types';

export class Mocked implements PaymentProvider {
  // eslint-disable-next-line @typescript-eslint/require-await
  async chargeForegroundPayment({
    payment,
    redirectUrl,
  }: {
    project: Project;
    payment: Payment;
    redirectUrl: string;
  }): Promise<{ checkoutUrl: string }> {
    const checkoutUrl = `${config.publicUrl}/api/mocked/checkout/${payment._id}?redirect_url=${redirectUrl}`;

    return { checkoutUrl };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async chargeBackgroundPayment({ payment }: { project: Project; payment: Payment }): Promise<void> {
    //
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date | undefined; paymentStatus: 'pending' | 'paid' | 'failed' }> {
    const { paymentId, paymentStatus, paidAt } = payload as {
      paymentStatus: 'pending' | 'paid' | 'failed';
      paidAt: string;
      paymentId: string;
    };

    return {
      paymentStatus,
      paidAt: new Date(paidAt),
      paymentId,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async createCustomer(customer: Customer): Promise<Customer> {
    customer.paymentProviderId = 'mocked-123';
    return customer;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateCustomer(customer: Customer): Promise<Customer> {
    return customer;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteCustomer(customer: Customer): Promise<void> {
    //
  }

  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async getPaymentMethod(paymentId: string): Promise<PaymentMethod> {
    return new PaymentMethod({
      name: `test **${Date.now().toString().slice(-2)}`,
      paymentProviderId: '123',
      type: 'credit_card',
    });
  }
}

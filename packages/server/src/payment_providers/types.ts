import { Customer, Payment, Project, Subscription } from '~/entities';

export interface PaymentProvider {
  startSubscription(d: {
    project: Project;
    subscription: Subscription;
    redirectUrl: string;
    payment: Payment;
  }): Promise<{
    checkoutUrl: string;
  }>;
  createCustomer(customer: Customer): Promise<Customer>;
  deleteCustomer(customer: Customer): Promise<void>;
  updateCustomer(customer: Customer): Promise<Customer>;
  chargePayment(d: { project: Project; payment: Payment }): Promise<void>;
  parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date | undefined; paymentStatus: 'pending' | 'paid' | 'failed' }>;
}

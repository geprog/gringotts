import { Customer, Payment, Subscription } from '~/entities';

export interface PaymentProvider {
  startSubscription(d: { subscription: Subscription; redirectUrl: string; payment: Payment }): Promise<{
    checkoutUrl: string;
  }>;
  createCustomer(customer: Customer): Promise<Customer>;
  deleteCustomer(customer: Customer): Promise<void>;
  updateCustomer(customer: Customer): Promise<Customer>;
  chargePayment(payment: Payment): Promise<void>;
  parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date; paymentStatus: 'pending' | 'paid' | 'failed' }>;
}

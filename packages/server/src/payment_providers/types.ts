import { Customer, Payment, PaymentMethod, Project } from '~/entities';

export interface PaymentProvider {
  createCustomer(customer: Customer): Promise<Customer>;
  deleteCustomer(customer: Customer): Promise<void>;
  updateCustomer(customer: Customer): Promise<Customer>;
  chargeForegroundPayment(d: {
    project: Project;
    payment: Payment;
    redirectUrl: string;
  }): Promise<{ checkoutUrl: string }>;
  chargeBackgroundPayment(d: { project: Project; payment: Payment }): Promise<void>;
  parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date | undefined; paymentStatus: 'pending' | 'paid' | 'failed' }>;
  getPaymentMethod(payload: unknown): Promise<PaymentMethod>;
}

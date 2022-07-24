import { Customer, Subscription } from '~/entities';

export interface PaymentProvider {
  startSubscription(d: {
    subscription: Subscription;
    redirectUrl: string;
    pricePerUnit: number;
    units: number;
  }): Promise<{
    checkoutUrl: string;
  }>;
  createCustomer(customer: Customer): Promise<Customer>;
  deleteCustomer(customer: Customer): Promise<void>;
  updateCustomer(customer: Customer): Promise<Customer>;
  chargeSubscription(d: { subscription: Subscription; date: Date }): Promise<void>;
  parsePaymentWebhook(payload: unknown): Promise<{ subscriptionId: string; paidAt: Date; paid: boolean }>;
}

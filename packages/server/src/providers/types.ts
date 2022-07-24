import { Subscription } from '~/entities';

export interface PaymentProvider {
  startSubscription(d: {
    subscription: Subscription;
    redirectUrl: string;
    pricePerUnit: number;
    units: number;
  }): Promise<{
    checkoutUrl: string;
  }>;
  // chargeSubscription({ subscription }: { subscription: Subscription }): Promise<void>;
  parsePaymentWebhook(payload: unknown): Promise<{ subscriptionId: string; paidAt: Date }>;
}

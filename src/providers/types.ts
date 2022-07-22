import { Subscription } from '~/types/subscription';

export type Customer = {
  id?: string;
  name: string;
  email: string;
};

export interface PaymentProvider {
  startSubscription({
    subscription,
    redirectUrl,
    pricePerUnit,
    units,
  }: {
    subscription: Subscription;
    redirectUrl: string;
    pricePerUnit: number;
    units: number;
  }): Promise<{
    checkoutUrl: string;
    subscription: Subscription;
  }>;
  // chargeSubscription({ subscription }: { subscription: Subscription }): Promise<void>;
  // parsePaymentWebhook(): Promise<void>;
}

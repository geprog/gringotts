import { config } from '~/config';
import { Mollie } from '~/payment_providers/mollie';
import { PaymentProvider } from '~/payment_providers/types';

export function getPaymentProvider(): PaymentProvider | undefined {
  if (config.mollieApiKey) {
    return new Mollie({ apiKey: config.mollieApiKey });
  }

  return undefined;
}

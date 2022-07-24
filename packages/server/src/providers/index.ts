import { config } from '~/config';
import { Mollie } from '~/providers/mollie';
import { PaymentProvider } from '~/providers/types';

export function getPaymentProvider(): PaymentProvider | undefined {
  if (config.mollieApiKey) {
    return new Mollie({ apiKey: config.mollieApiKey });
  }

  return undefined;
}

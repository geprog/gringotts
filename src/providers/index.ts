import { config } from '~/config';
import { Mollie } from '~/providers/mollie';
import { PaymentProvider } from '~/providers/types';

export const paymentProvider: PaymentProvider = new Mollie({
  apiKey: config.mollieApiKey,
  webhookUrl: `${config.publicUrl}/payment/webhook`, // TODO
});

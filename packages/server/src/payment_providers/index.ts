import { Project } from '~/entities';
import { Mocked } from '~/payment_providers/mocked';
import { Mollie } from '~/payment_providers/mollie';
import { PaymentProvider } from '~/payment_providers/types';

export function getPaymentProvider(project: Project): PaymentProvider | undefined {
  if (project.paymentProvider === 'mock') {
    return new Mocked();
  }

  if (project.paymentProvider === 'mollie' && project.mollieApiKey) {
    return new Mollie({ apiKey: project.mollieApiKey });
  }

  return undefined;
}

export function parsePaymentWebhook(
  paymentProviderName: string,
  payload: unknown,
): ReturnType<PaymentProvider['parsePaymentWebhook']> | undefined {
  if (paymentProviderName === 'mock') {
    return new Mocked().parsePaymentWebhook(payload);
  }

  if (paymentProviderName === 'mollie') {
    // TODO: think about way to load mollie provider without key?
    return new Mollie({ apiKey: 'todo' }).parsePaymentWebhook(payload);
  }

  return undefined;
}

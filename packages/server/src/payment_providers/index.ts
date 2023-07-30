import { Project } from '~/entities';
import { Mocked } from '~/payment_providers/mocked';
import { Mollie } from '~/payment_providers/mollie';
import { PaymentProvider } from '~/payment_providers/types';

export function getPaymentProvider(project: Project): PaymentProvider | undefined {
  if (project.paymentProvider === 'mocked') {
    return new Mocked();
  }

  if (project.paymentProvider === 'mollie' && project.mollieApiKey) {
    return new Mollie({ apiKey: project.mollieApiKey });
  }

  return undefined;
}

import { createMollieClient, Mandate, MollieClient, PaymentStatus, SequenceType } from '@mollie/api-client';

import { config } from '~/config';
import { Customer, Payment, PaymentMethod, Project } from '~/entities';
import { PaymentProvider } from '~/payment_providers/types';

type Metadata = {
  paymentId: string;
};

export class Mollie implements PaymentProvider {
  api: MollieClient;

  constructor({ apiKey }: { apiKey: string }) {
    if (!apiKey) {
      throw new Error('No api key');
    }

    this.api = createMollieClient({ apiKey });
  }

  async chargeForegroundPayment({
    project,
    payment,
    redirectUrl,
  }: {
    project: Project;
    payment: Payment;
    redirectUrl: string;
  }): Promise<{ checkoutUrl: string }> {
    const customer = await this.api.customers.get(payment.customer.paymentProviderId);

    const _payment = await this.api.payments.create({
      amount: {
        value: this.priceToMolliePrice(payment.amount),
        currency: payment.currency,
      },
      customerId: customer.id,
      description: payment.description,
      sequenceType: SequenceType.first,
      redirectUrl,
      webhookUrl: `${config.publicUrl}/api/payment/webhook/${project._id}`,
      metadata: <Metadata>{
        paymentId: payment._id,
      },
    });

    const checkoutUrl = _payment._links.checkout?.href;
    if (!checkoutUrl) {
      throw new Error('No checkout url received');
    }

    return { checkoutUrl };
  }

  async chargeBackgroundPayment({ payment, project }: { payment: Payment; project: Project }): Promise<void> {
    if (!payment.customer) {
      throw new Error('No customer configured for this payment');
    }

    const paymentMethod = payment.customer.activePaymentMethod;
    if (!paymentMethod) {
      throw new Error('No payment method configured for this customer');
    }

    await this.api.payments.create({
      amount: {
        value: this.priceToMolliePrice(payment.amount),
        currency: payment.currency,
      },
      description: payment.description,
      sequenceType: SequenceType.recurring,
      customerId: payment.customer.paymentProviderId,
      mandateId: paymentMethod.paymentProviderId,
      webhookUrl: `${config.publicUrl}/api/payment/webhook/${project._id}`,
      metadata: <Metadata>{
        paymentId: payment._id,
      },
    });
  }

  private convertPaymentStatus(paymentStatus: PaymentStatus) {
    // TODO: check meaning of authorized
    if (paymentStatus === PaymentStatus.paid || paymentStatus === PaymentStatus.authorized) {
      return 'paid';
    }

    if (
      paymentStatus === PaymentStatus.failed ||
      paymentStatus === PaymentStatus.expired ||
      paymentStatus === PaymentStatus.canceled
    ) {
      return 'failed';
    }

    return 'pending';
  }

  async parsePaymentWebhook(
    payload: unknown,
  ): Promise<{ paymentId: string; paidAt: Date | undefined; paymentStatus: 'pending' | 'paid' | 'failed' }> {
    const _payload = payload as { id?: string };
    if (!_payload.id) {
      throw new Error('No id defined in payload');
    }

    const payment = await this.api.payments.get(_payload.id);

    const metadata = payment.metadata as Metadata;

    return {
      paymentStatus: this.convertPaymentStatus(payment.status),
      paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
      paymentId: metadata.paymentId,
    };
  }

  async createCustomer(customer: Customer): Promise<Customer> {
    const mollieCustomer = await this.api.customers.create({
      name: customer.name,
      email: customer.email,
    });

    customer.paymentProviderId = mollieCustomer.id;

    return customer;
  }

  async updateCustomer(customer: Customer): Promise<Customer> {
    const mollieCustomer = await this.api.customers.update(customer.paymentProviderId, {
      name: customer.name,
      email: customer.email,
    });

    customer.paymentProviderId = mollieCustomer.id;

    return customer;
  }

  async deleteCustomer(customer: Customer): Promise<void> {
    await this.api.customers.delete(customer.paymentProviderId);
  }

  async getPaymentMethod(payload: unknown): Promise<PaymentMethod> {
    const _payload = payload as { id?: string };
    if (!_payload.id) {
      throw new Error('No id defined in payload');
    }

    const payment = await this.api.payments.get(_payload.id);

    if (!payment.mandateId) {
      throw new Error('No mandate id set');
    }

    if (!payment.customerId) {
      throw new Error('No customer id set');
    }

    const mandate = await this.api.customerMandates.get(payment.mandateId, { customerId: payment.customerId });

    const details = this.getPaymentMethodDetails(mandate);

    return new PaymentMethod({
      paymentProviderId: mandate.id,
      name: details.name,
      type: details.type,
    });
  }

  private getPaymentMethodDetails(mandate: Mandate): { type: string; name: string } {
    if ((mandate.details as MandateDetailsCreditCard).cardNumber) {
      const details = mandate.details as MandateDetailsCreditCard;
      return {
        type: 'credit_card',
        name: `**** ${details.cardNumber.substring(details.cardNumber.length - 4)}`,
      };
    }

    if ((mandate.details as MandateDetailsDirectDebit).consumerName) {
      const details = mandate.details as MandateDetailsDirectDebit;
      return {
        type: 'direct_debit',
        name: `**** ${details.consumerAccount.substring(details.consumerAccount.length - 4)}`,
      };
    }

    return {
      type: 'unknown',
      name: '',
    };
  }

  private priceToMolliePrice(price: number): string {
    return `${(Math.round(price * 100) / 100).toFixed(2)}`;
  }
}

type MandateDetailsDirectDebit = {
  consumerName: string;
  consumerAccount: string;
  consumerBic: string;
};

type MandateDetailsCreditCard = {
  cardHolder: string;
  cardNumber: string;
};

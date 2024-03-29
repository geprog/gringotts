import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Customer } from '~/entities/customer';
import { Invoice } from '~/entities/invoice';
import { Project } from '~/entities/project';
import { Subscription } from '~/entities/subscription';

export type PaymentStatus = 'processing' | 'paid' | 'failed';

export type Currency = 'EUR';

export class Payment {
  _id: string = v4();
  project!: Project;
  status: PaymentStatus = 'processing';
  type!: 'recurring' | 'one-off' | 'verification';
  currency!: Currency;
  customer!: Customer;
  amount!: number;
  description!: string;
  subscription?: Subscription;
  invoice?: Invoice;

  constructor(data?: Partial<Payment>) {
    Object.assign(this, data);
  }

  toJSON(): Payment {
    return {
      ...this,
      subscription: this.subscription?.toJSON(),
      customer: this.customer.toJSON(),
      invoice: this.invoice
        ? {
            _id: this.invoice?._id,
          }
        : undefined,
    };
  }
}

export const paymentSchema = new EntitySchema<Payment>({
  class: Payment,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    status: { type: 'string' },
    type: { type: 'string', default: 'recurring' },
    currency: { type: 'string' },
    amount: { type: 'float' },
    description: { type: 'string' },
    customer: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Customer,
    },
    subscription: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Subscription,
      nullable: true,
    },
    project: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Project,
    },
    invoice: {
      reference: ReferenceType.ONE_TO_ONE,
      entity: () => Invoice,
      mappedBy: (invoice: Invoice) => invoice.payment,
      nullable: true,
    },
  },
});

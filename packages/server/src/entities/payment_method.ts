import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Customer } from '~/entities/customer';
import { Project } from '~/entities/project';

export type PaymentMethodStatus = 'pending' | 'verified' | 'rejected';

// The PaymentMethod entity is used to store payment methods for a customer.
export class PaymentMethod {
  _id: string = v4();
  paymentProviderId!: string; // the id of the payment method in the payment provider
  type!: string;
  name!: string;
  customer!: Customer;
  project!: Project;

  constructor(data?: Partial<PaymentMethod>) {
    Object.assign(this, data);
  }
}

export const paymentMethodSchema = new EntitySchema<PaymentMethod>({
  class: PaymentMethod,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    paymentProviderId: { type: 'string' },
    type: { type: 'string' },
    name: { type: 'string' },
    status: { type: 'string' },
    customer: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Customer,
    },
    minimumAmount: { type: 'number' },
    project: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Project,
    },
  },
});

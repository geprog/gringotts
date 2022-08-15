import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Customer } from '~/entities/customer';
import { Subscription } from '~/entities/subscription';

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export type PaymentCurrency = 'EUR';

export class Payment {
  _id: string = v4();

  status: PaymentStatus = 'pending';

  currency!: PaymentCurrency;

  customer!: Customer;

  price!: number;

  description!: string;

  isRecurring = false;

  subscription!: Subscription;

  constructor(data?: Partial<Payment>) {
    Object.assign(this, data);
  }
}

export const paymentSchema = new EntitySchema<Payment>({
  class: Payment,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    status: { type: String },
    currency: { type: String },
    price: { type: 'float' },
    description: { type: String },
    isRecurring: { type: Boolean },
    customer: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Customer,
    },
    subscription: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Subscription,
    },
  },
});

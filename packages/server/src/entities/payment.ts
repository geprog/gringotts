import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Subscription } from '~/entities/subscription';

export type PaymentStatus = 'open' | 'pending' | 'paid' | 'failed';

export class Payment {
  _id: string = v4();

  status: PaymentStatus = 'open';

  currency: 'EUR' = 'EUR'; // TODO: support custom currencies

  price!: number;

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
    subscription: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Subscription,
    },
  },
});

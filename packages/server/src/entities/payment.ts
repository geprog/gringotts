import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Invoice } from '~/entities/invoice';

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export type PaymentCurrency = 'EUR';

export class Payment {
  _id: string = v4();

  status: PaymentStatus = 'pending';

  currency!: PaymentCurrency;

  price!: number;

  invoice?: Invoice;

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
    invoice: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Invoice,
    },
  },
});

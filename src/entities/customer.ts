import { Collection, EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Subscription } from '~/entities/subscription';

export class Customer {
  _id: string = v4();

  paymentProviderId!: string;

  name!: string;

  email!: string;

  subscriptions = new Collection<Subscription>(this);

  constructor(data?: Partial<Customer>) {
    Object.assign(this, data);
  }
}

export const customerSchema = new EntitySchema<Customer>({
  class: Customer,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    paymentProviderId: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', unique: true },
    subscriptions: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => Subscription,
      mappedBy: (subscription) => subscription.customer,
    },
  },
});

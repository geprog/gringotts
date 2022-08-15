import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Subscription } from '~/entities/subscription';

export class SubscriptionChange {
  _id: string = v4();

  start!: Date;

  end?: Date;

  pricePerUnit!: number;

  units!: number;

  subscription!: Subscription;

  constructor(data?: Partial<SubscriptionChange>) {
    Object.assign(this, data);
  }
}

export const subscriptionChangeSchema = new EntitySchema<SubscriptionChange>({
  class: SubscriptionChange,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    start: { type: Date },
    end: { type: Date, nullable: true },
    pricePerUnit: { type: 'float' },
    units: { type: Number },
    subscription: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Subscription,
    },
  },
});

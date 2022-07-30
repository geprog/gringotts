import { Collection, EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Customer } from '~/entities/customer';
import { SubscriptionChange } from '~/entities/subscription_change';

export class Subscription {
  _id: string = v4();

  anchorDate!: Date; // first date a user ever started a subscription for the object

  lastPayment?: Date;

  customer!: Customer;

  changes = new Collection<SubscriptionChange>(this);

  createdAt: Date = new Date();

  updatedAt: Date = new Date();

  constructor(data?: Partial<Subscription>) {
    Object.assign(this, data);
  }

  /**
   * End the current plan and start with a new one
   * @param data.pricePerUnit Price per unit for the new plan
   * @param data.units Units for the new plan
   * @param data.changeDate Date when to end the current plan and start with a new one
   */
  changePlan(data: { pricePerUnit: number; units: number; changeDate?: Date }): void {
    // set end date of last change if we have one
    if (this.changes.count() > 0) {
      if (data.changeDate === undefined) {
        throw new Error('changeDate is required if you already have a change');
      }
      this.changes[this.changes.count() - 1].end = data.changeDate;
    }

    this.changes.add(
      new SubscriptionChange({
        start: this.changes.count() === 0 ? this.anchorDate : (data.changeDate as Date),
        pricePerUnit: data.pricePerUnit,
        units: data.units,
        subscription: this,
      }),
    );
  }
}

export const subscriptionSchema = new EntitySchema<Subscription>({
  class: Subscription,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    anchorDate: { type: Date },
    lastPayment: { type: Date, nullable: true },
    customer: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Customer,
    },
    changes: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => SubscriptionChange,
      mappedBy: (subscriptionChange) => subscriptionChange.subscription,
    },
    createdAt: { type: Date, onCreate: () => new Date() },
    updatedAt: { type: Date, onUpdate: () => new Date() },
  },
});

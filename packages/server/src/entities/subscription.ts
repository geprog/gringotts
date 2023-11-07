import { Collection, EntitySchema, ReferenceType } from '@mikro-orm/core';
import dayjs from 'dayjs';
import { v4 } from 'uuid';

import { Customer } from '~/entities/customer';
import { Invoice } from '~/entities/invoice';
import { Project } from '~/entities/project';
import { SubscriptionChange } from '~/entities/subscription_change';
import { SubscriptionPeriod } from '~/entities/subscription_period';

export class Subscription {
  _id: string = v4();
  metadata?: Record<string, unknown>;
  anchorDate!: Date; // first date a user ever started a subscription for the object
  status: 'processing' | 'active' | 'error' = 'active';
  error?: string;
  lastPayment?: Date;
  currentPeriodStart!: Date;
  currentPeriodEnd!: Date;
  customer!: Customer;
  changes = new Collection<SubscriptionChange>(this);
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  invoices = new Collection<Invoice>(this);
  project!: Project;

  constructor(data?: Partial<Subscription>) {
    Object.assign(this, data);
  }

  cleanupChanges(): void {
    const changes = this.changes.getItems();

    // set end date of existing changes
    if (changes.length > 0) {
      // sort changes in reverse order by start date
      changes.sort((a, b) => b.start.getTime() - a.start.getTime());

      let lastEnd: Date | undefined = undefined;
      for (const change of changes) {
        if (!change.end) {
          change.end = lastEnd;
        }
        lastEnd = dayjs(change.start).subtract(1, 'second').toDate();
      }

      this.changes.set(changes);
    }
  }

  /**
   * End the current plan and start with a new one
   * @param data.pricePerUnit Price per unit for the new plan
   * @param data.units Units for the new plan
   * @param data.changeDate Date when to end the current plan and start with a new one
   */
  changePlan(data: { pricePerUnit: number; units: number; changeDate?: Date }): void {
    this.changes.add(
      new SubscriptionChange({
        start: this.changes.count() === 0 ? this.anchorDate : (data.changeDate as Date),
        pricePerUnit: data.pricePerUnit,
        units: data.units,
        subscription: this,
      }),
    );

    this.cleanupChanges();
  }

  getPeriod(start: Date, end: Date): SubscriptionPeriod {
    return new SubscriptionPeriod(this, start, end);
  }

  toJSON(): Subscription {
    return {
      ...this,
      changes: this.changes?.isInitialized()
        ? this.changes.getItems().map((change) => ({ ...change, subscription: undefined }))
        : [],
    };
  }
}

export const subscriptionSchema = new EntitySchema<Subscription>({
  class: Subscription,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    metadata: { type: 'json', nullable: true },
    anchorDate: { type: Date },
    status: { type: 'string', default: 'active' },
    error: { type: 'string', nullable: true },
    lastPayment: { type: Date, nullable: true },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    customer: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Customer,
    },
    changes: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => SubscriptionChange,
      mappedBy: (change: SubscriptionChange) => change.subscription,
    },
    createdAt: { type: Date, onCreate: () => new Date() },
    updatedAt: { type: Date, onUpdate: () => new Date() },
    invoices: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => Invoice,
      mappedBy: (invoice: Invoice) => invoice.subscription,
    },
    project: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Project,
    },
  },
});

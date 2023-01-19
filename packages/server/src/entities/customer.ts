import { Collection, EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Project } from '~/entities/project';
import { Subscription } from '~/entities/subscription';

export class Customer {
  _id: string = v4();
  paymentProviderId!: string;
  name!: string;
  email!: string;
  addressLine1!: string;
  addressLine2?: string;
  city!: string;
  zipCode!: string;
  country!: string;
  subscriptions = new Collection<Subscription>(this);
  invoicePrefix!: string;
  invoiceCounter = 0;
  project!: Project;

  constructor(data?: Partial<Customer>) {
    Object.assign(this, data);
    if (!this.invoicePrefix) {
      this.createInvoicePrefix();
    }
  }

  createInvoicePrefix(): void {
    const appId = 'INV'; // TODO: allow to configure prefix?
    const randomId = (Math.random() + 1).toString(36).substring(2, 6); // 4 letter
    const customerId = this._id.substring(this._id.length - 3);
    this.invoicePrefix = [appId, customerId, randomId].map((s) => s.toUpperCase()).join('-');
  }
}

export const customerSchema = new EntitySchema<Customer>({
  class: Customer,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    paymentProviderId: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    addressLine1: { type: 'string' },
    addressLine2: { type: 'string', nullable: true },
    city: { type: 'string' },
    zipCode: { type: 'string' },
    country: { type: 'string' },
    invoicePrefix: { type: 'string' },
    invoiceCounter: { type: 'number' },
    subscriptions: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => Subscription,
      mappedBy: (subscription) => subscription.customer,
    },
    project: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Project,
    },
  },
});

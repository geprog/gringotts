import { Collection, EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Customer } from '~/entities/customer';
import { Invoice } from '~/entities/invoice';
import { Currency } from '~/entities/payment';
import { ProjectInvoiceData } from '~/entities/project_invoice_data';
import { Subscription } from '~/entities/subscription';

export class Project {
  _id: string = v4();
  name!: string;
  customers = new Collection<Customer>(this);
  subscriptions = new Collection<Subscription>(this);
  invoices = new Collection<Invoice>(this);
  invoiceData?: ProjectInvoiceData;
  apiToken!: string;
  webhookUrl!: string;
  paymentProvider!: 'mock' | 'mollie';
  mollieApiKey?: string;
  currency!: Currency;
  vatRate!: number;

  constructor(data?: Partial<Project>) {
    Object.assign(this, data);
  }
}

export const projectSchema = new EntitySchema<Project>({
  class: Project,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    name: { type: String },
    customers: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => Customer,
    },
    subscriptions: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => Subscription,
    },
    invoices: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => Invoice,
    },
    invoiceData: {
      reference: ReferenceType.ONE_TO_ONE,
      entity: () => ProjectInvoiceData,
    },
    apiToken: { type: 'string' },
    webhookUrl: { type: 'string' },
    paymentProvider: { type: 'string' },
    mollieApiKey: { type: 'string' },
    currency: { type: 'string', default: 'EUR' },
    vatRate: { type: 'number', default: 19.0 },
  },
});

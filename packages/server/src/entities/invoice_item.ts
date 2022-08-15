import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Invoice } from './invoice';

export class InvoiceItem {
  _id: string = v4();
  pricePerUnit!: number;
  units!: number;
  description?: string;
  invoice!: Invoice;

  constructor(data: Partial<InvoiceItem>) {
    Object.assign(this, data);
  }
}

export const invoiceItemSchema = new EntitySchema<InvoiceItem>({
  class: InvoiceItem,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    pricePerUnit: { type: 'float' },
    units: { type: Number },
    description: { type: String },
    invoice: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => Invoice,
    },
  },
});

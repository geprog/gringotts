import { Collection, EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { InvoiceItem } from '~/entities/invoice_item';
import { Payment } from '~/entities/payment';
import { Subscription } from '~/entities/subscription';

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed';

export class Invoice {
  _id: string = v4();
  start!: Date; // TODO: should this really be part of an invoice?
  end!: Date; // TODO: should this really be part of an invoice?
  items = new Collection<InvoiceItem>(this);
  status: InvoiceStatus = 'draft';
  subscription?: Subscription;
  payment?: Payment;

  constructor(data?: Partial<Invoice>) {
    Object.assign(this, data);
  }

  static roundPrice(price: number): number {
    return Math.round((price + Number.EPSILON) * 100) / 100;
  }

  getPrice(): number {
    const price = this.items.getItems().reduce((cum, change) => cum + change.pricePerUnit * change.units, 0);
    return Invoice.roundPrice(price);
  }

  // toString(): string {
  //   const formatDate = (date: Date) => dayjs(date).format('DD.MM.YYYY HH:mm');
  //   const diffMsToDates = (diffMs: number) => Math.round(diffMs / (1000 * 60 * 60 * 24));
  //   const periodDays = dayjs(this.end).diff(this.start);
  //   return `Invoice from ${formatDate(this.start)} to ${formatDate(this.end)}\n${this.items
  //     .map((item, i) => {
  //       const basePrice = Invoice.roundPrice(item.pricePerUnit * item.units);
  //       const period = dayjs(item.end).diff(item.start);
  //       const percentDays = Invoice.roundPrice(period / periodDays);
  //       let s = `\t${i + 1}: ${formatDate(item.start)} - ${formatDate(item.end)}:`;
  //       s += `\n\t\t${diffMsToDates(period)} days of ${diffMsToDates(periodDays)} = ${percentDays}%`;
  //       s += `\n\t\t${item.pricePerUnit}$ * ${item.units}units = ${basePrice}$`;
  //       s += `\n\t\t${percentDays}% * ${basePrice}$ = ${Invoice.roundPrice(this.getPriceForInvoiceItem(item))}$`;
  //       return s;
  //     })
  //     .join('\n')}\nTotal: ${Invoice.roundPrice(this.getPrice())}$`;
  // }
}

export const invoiceSchema = new EntitySchema<Invoice>({
  class: Invoice,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    start: { type: 'date' },
    end: { type: 'date' },
    status: { type: String },
    items: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => InvoiceItem,
    },
    subscription: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Subscription,
    },
    payment: {
      reference: ReferenceType.ONE_TO_ONE,
      entity: () => Payment,
    },
  },
});

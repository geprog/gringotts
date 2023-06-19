import { Collection, EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { InvoiceItem } from '~/entities/invoice_item';
import { Currency, Payment } from '~/entities/payment';
import { Project } from '~/entities/project';
import { Subscription } from '~/entities/subscription';
import dayjs from '~/lib/dayjs';

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed';

export class Invoice {
  _id: string = v4();
  date!: Date;
  sequentialId!: number;
  items = new Collection<InvoiceItem>(this);
  status: InvoiceStatus = 'draft';
  subscription!: Subscription;
  currency!: Currency;
  vatRate!: number;
  payment?: Payment;
  project!: Project;
  file?: string;

  constructor(data?: Partial<Invoice>) {
    Object.assign(this, data);
  }

  get amount(): number {
    return Invoice.roundPrice(this.items.getItems().reduce((acc, item) => acc + item.pricePerUnit * item.units, 0));
  }

  get vatAmount(): number {
    return Invoice.roundPrice(this.amount * (this.vatRate / 100));
  }

  get totalAmount(): number {
    return Invoice.roundPrice(this.amount + this.vatAmount);
  }

  get number(): string {
    const invoicePrefix = this.subscription?.customer?.invoicePrefix || 'INV-___-____';
    const sequentialId = String(this.sequentialId || 0).padStart(3, '0');
    return [invoicePrefix, sequentialId].join('-');
  }

  static roundPrice(_price: number): number {
    const price = Math.round((_price + Number.EPSILON) * 100) / 100;
    return price === 0 ? 0 : price; // convert -0 to 0
  }

  static amountToPrice(amount: number, currency: Currency): string {
    switch (currency) {
      case 'EUR':
        return `${Invoice.roundPrice(amount).toFixed(2)} €`;
      default:
        throw new Error('Currency not supported');
    }
  }

  toString(): string {
    const formatDate = (date: Date) => dayjs(date).format('DD.MM.YYYY HH:mm');
    return `Invoice from ${formatDate(this.date)}\n${this.items
      .getItems()
      .map((item) => {
        const basePrice = Invoice.roundPrice(item.pricePerUnit * item.units);
        return `\n\t\t${item.pricePerUnit}$ * ${item.units}units = ${basePrice}$`;
      })
      .join('\n')}\nVat (${this.vatRate}%): ${Invoice.amountToPrice(
      this.vatAmount,
      this.currency,
    )} \nTotal: ${Invoice.amountToPrice(this.totalAmount, this.currency)}$`;
  }

  toJSON(): Invoice {
    return {
      ...this,
      vatAmount: this.vatAmount,
      amount: this.amount,
      totalAmount: this.totalAmount,
      number: this.number,
      items: this.items.getItems(),
    };
  }
}

export const invoiceSchema = new EntitySchema<Invoice>({
  class: Invoice,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    number: { type: 'string' },
    date: { type: 'date' },
    status: { type: String },
    items: {
      reference: ReferenceType.ONE_TO_MANY,
      entity: () => InvoiceItem,
      mappedBy: (item: InvoiceItem) => item.invoice,
    },
    subscription: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Subscription,
    },
    payment: {
      reference: ReferenceType.ONE_TO_ONE,
      entity: () => Payment,
      nullable: true,
    },
    vatRate: { type: 'float' },
    currency: { type: String },
    sequentialId: { type: Number },
    project: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Project,
    },
    file: { type: 'string', nullable: true },
  },
});

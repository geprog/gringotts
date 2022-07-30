import dayjs from '~/lib/dayjs';

export type InvoiceItem = {
  start: Date;
  end: Date;
  pricePerUnit: number;
  units: number;
};

export class Invoice {
  start: Date;
  end: Date;
  items: InvoiceItem[] = [];
  paid = false;
  status: 'pending' | 'paid' | 'failed' = 'pending';
  downloadUrl?: string;

  constructor(invoice: { start: Date; end: Date; items?: InvoiceItem[] }) {
    this.start = invoice?.start;
    this.end = invoice?.end;
    if (invoice.items) {
      this.items = invoice.items;
    }
  }

  private getPriceForInvoiceItem(item: InvoiceItem): number {
    const basePrice = item.pricePerUnit * item.units;
    const start = dayjs(item.start);
    const end = dayjs(item.end);
    const itemDiff = dayjs(start).diff(end);
    const invoiceDiff = dayjs(this.start).diff(this.end);
    return (basePrice / invoiceDiff) * itemDiff;
  }

  static roundPrice(price: number): number {
    return Math.round((price + Number.EPSILON) * 100) / 100;
  }

  getPrice(): number {
    const price = this.items.reduce((cum, change) => cum + this.getPriceForInvoiceItem(change), 0);
    return Invoice.roundPrice(price);
  }

  toString(): string {
    const formatDate = (date: Date) => dayjs(date).format('DD.MM.YYYY HH:mm');
    const diffMsToDates = (diffMs: number) => Math.round(diffMs / (1000 * 60 * 60 * 24));
    const periodDays = dayjs(this.end).diff(this.start);
    return `Invoice from ${formatDate(this.start)} to ${formatDate(this.end)}\n${this.items
      .map((item, i) => {
        const basePrice = Invoice.roundPrice(item.pricePerUnit * item.units);
        const period = dayjs(item.end).diff(item.start);
        const percentDays = Invoice.roundPrice(period / periodDays);
        let s = `\t${i + 1}: ${formatDate(item.start)} - ${formatDate(item.end)}:`;
        s += `\n\t\t${diffMsToDates(period)} days of ${diffMsToDates(periodDays)} = ${percentDays}%`;
        s += `\n\t\t${item.pricePerUnit}$ * ${item.units}units = ${basePrice}$`;
        s += `\n\t\t${percentDays}% * ${basePrice}$ = ${Invoice.roundPrice(this.getPriceForInvoiceItem(item))}$`;
        return s;
      })
      .join('\n')}\nTotal: ${Invoice.roundPrice(this.getPrice())}$`;
  }
}

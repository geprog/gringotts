import { Invoice } from '~/entities/invoice';
import { InvoiceItem } from '~/entities/invoice_item';
import { Subscription } from '~/entities/subscription';
import { SubscriptionChange } from '~/entities/subscription_change';
import dayjs from '~/lib/dayjs';

type InvoiceSubscriptionItem = {
  start: Date;
  end: Date;
  units: number;
  pricePerUnit: number;
};

export class SubscriptionPeriod {
  readonly start: Date;
  readonly end: Date;
  readonly changes: SubscriptionChange[];

  constructor(subscription: Subscription, start: Date, end: Date) {
    this.start = start;
    this.end = end;

    this.changes = subscription.changes
      .getItems()
      .filter((change) => {
        const changeEnd = change.end || end;
        return dayjs(changeEnd).isBetween(start, end, 'day', '[]');
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private getPriceForInvoiceItem(item: InvoiceSubscriptionItem): number {
    const basePrice = item.pricePerUnit * item.units;
    const start = dayjs(item.start);
    const end = dayjs(item.end);
    const itemDiff = dayjs(start).diff(end);
    const invoiceDiff = dayjs(this.start).diff(this.end);
    return (basePrice / invoiceDiff) * itemDiff;
  }

  getInvoiceItems(): InvoiceItem[] {
    const items: InvoiceItem[] = [];

    const periodDays = dayjs(this.end).diff(this.start);
    const diffMsToDates = (diffMs: number) => Math.round(diffMs / (1000 * 60 * 60 * 24));
    const formatDate = (date: Date) => dayjs(date).format('DD.MM.YYYY');

    let start = this.start;
    for (const [i, change] of this.changes.entries()) {
      if (!change.end && i !== this.changes.length - 1 && this.changes.length > 1) {
        throw new Error('Only the last item is allowed to have no end date');
      }

      const item: InvoiceSubscriptionItem = {
        start,
        end: change.end || this.end, // use this.end for the last entry
        units: change.units,
        pricePerUnit: change.pricePerUnit,
      };

      const priceForPeriod = this.getPriceForInvoiceItem(item);
      const basePrice = item.pricePerUnit * item.units;
      const period = dayjs(item.end).diff(item.start);
      const percentDays = Math.floor(Invoice.roundPrice(period / periodDays) * 100);
      const currency = 'EUR'; // TODO: use appropriate currency
      let description = `${formatDate(item.start)} - ${formatDate(item.end)}:`;
      description += `\n\t${diffMsToDates(period)} days of ${diffMsToDates(periodDays)} = ${percentDays}%`;
      description += `\n\t${Invoice.amountToPrice(item.pricePerUnit, currency)} * ${
        item.units
      } units = ${Invoice.amountToPrice(basePrice, currency)}`;
      description += `\n\t${percentDays}% * ${Invoice.amountToPrice(basePrice, currency)} = ${Invoice.amountToPrice(
        this.getPriceForInvoiceItem(item),
        currency,
      )}`;

      items.push(
        new InvoiceItem({
          units: 1,
          pricePerUnit: Invoice.roundPrice(priceForPeriod),
          description,
        }),
      );

      start = change.end as Date;
    }

    return items;
  }
}

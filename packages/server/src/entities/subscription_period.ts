import { InvoiceItem } from '~/entities/invoice_item';
import { Subscription } from '~/entities/subscription';
import { SubscriptionChange } from '~/entities/subscription_change';
import dayjs from '~/lib/dayjs';
import { getPeriodFromAnchorDate } from '~/utils';

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
        const changeEnd = change.end || getPeriodFromAnchorDate(change.start, subscription.anchorDate).end;
        return dayjs(changeEnd).isBetween(start, end, 'day', '[]');
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  getPriceForInvoiceItem(item: InvoiceSubscriptionItem): number {
    const basePrice = item.pricePerUnit * item.units;
    const start = dayjs(item.start);
    const end = dayjs(item.end);
    const itemDiff = dayjs(start).diff(end);
    const invoiceDiff = dayjs(this.start).diff(this.end);
    return (basePrice / invoiceDiff) * itemDiff;
  }

  getInvoiceItems(): InvoiceItem[] {
    const items: InvoiceItem[] = [];

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

      items.push(
        new InvoiceItem({
          units: 1,
          pricePerUnit: priceForPeriod,
          description: `Period from ${start.toLocaleDateString()} to ${item.end.toLocaleDateString()}`,
        }),
      );

      start = change.end as Date;
    }

    return items;
  }
}

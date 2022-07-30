import { Invoice, InvoiceItem } from '~/entities/invoice';
import { SubscriptionChange } from '~/entities/subscription_change';

export class SubscriptionPeriod {
  readonly start: Date;
  readonly end: Date;
  readonly changes: SubscriptionChange[] = [];

  constructor(data: Pick<SubscriptionPeriod, 'changes' | 'end' | 'start'>) {
    this.start = data.start;
    this.end = data.end;
    this.changes = data.changes;
  }

  getInvoice(): Invoice {
    const items: InvoiceItem[] = [];

    let start = this.start;
    for (const [i, change] of this.changes.entries()) {
      if (!change.end && i !== this.changes.length - 1 && this.changes.length > 1) {
        throw new Error('Only the last item is allowed to have no end date');
      }

      items.push({
        start,
        end: change.end || this.end, // use this.end for the last entry
        units: change.units,
        pricePerUnit: change.pricePerUnit,
      });

      start = change.end as Date;
    }

    return new Invoice({ start: this.start, end: this.end, items });
  }
}

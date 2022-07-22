import { Invoice, InvoiceItem } from '~/types/invoice';
import { SubscriptionChange } from '~/types/subscription_change';

export class SubscriptionPeriod {
  readonly start: Date;
  readonly end: Date;
  readonly changes: SubscriptionChange[] = [];

  constructor(data: Pick<SubscriptionPeriod, 'changes' | 'end' | 'start'>) {
    this.start = data.start;
    this.end = data.end;
    this.changes = data.changes;
  }

  // static from(jsonStr: string): SubscriptionPeriod {
  //   const json = JSON.parse(jsonStr, (key, value) => {
  //     // TODO: is there a nicer way to handle dates?
  //     if (['endDate', 'start', 'end'].includes(key) && typeof value === 'string') {
  //       return new Date(value);
  //     }

  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //     return value;
  //   }) as SubscriptionPeriod;
  //   return Object.assign(new SubscriptionPeriod({} as never), json);
  // }

  getInvoice(): Invoice {
    const items: InvoiceItem[] = [];

    let start = this.start;
    for (const [i, change] of this.changes.entries()) {
      if (!change.endDate && i !== this.changes.length - 1 && this.changes.length > 1) {
        throw new Error('Only the last item is allowed to have no end date');
      }

      items.push({
        start,
        end: change.endDate || this.end, // use this.end for the last entry
        units: change.units,
        pricePerUnit: change.pricePerUnit,
      });

      start = change.endDate as Date;
    }

    return new Invoice({ start: this.start, end: this.end, items });
  }
}

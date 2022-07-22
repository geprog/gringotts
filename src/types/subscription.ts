import dayjs from '~/lib/dayjs';
import { getPeriodFromAnchorDate } from '~/utils';

import { AbstractEntity } from './abstract_entity';
import { SubscriptionChange } from './subscription_change';
import { SubscriptionPeriod } from './subscription_period';

export class Subscription extends AbstractEntity {
  readonly objectId!: string; // id of the object that is subscription is related to
  readonly anchorDate!: Date; // first date a user ever started a subscription for the object
  readonly customer?: { id?: string; name: string; email: string };
  readonly changes: SubscriptionChange[] = [];
  readonly cycleEveryX = 'month'; // TODO
  // readonly startDateOfPaymentCycle!: Date;

  constructor(data?: Partial<Subscription>) {
    super();
    Object.assign(this, data);
  }

  /**
   * End the current plan and start with a new one
   * @param data.pricePerUnit Price per unit for the new plan
   * @param data.units Units for the new plan
   * @param data.changeDate Date when to end the current plan and start with a new one
   */
  changePlan(data: { pricePerUnit: number; units: number; changeDate?: Date }): void {
    // set end date of last change if we have one
    if (this.changes.length > 0) {
      if (data.changeDate === undefined) {
        throw new Error('changeDate is required if you already have a change');
      }
      this.changes[this.changes.length - 1].end = data.changeDate;
    }

    this.changes.push({
      start: this.changes.length === 0 ? this.anchorDate : (data.changeDate as Date),
      pricePerUnit: data.pricePerUnit,
      units: data.units,
    });
  }

  getPeriod(date: Date): SubscriptionPeriod {
    const { start, end } = getPeriodFromAnchorDate(date, this.anchorDate);
    const changes = this.changes.filter((change) => {
      const changeEnd = change.end || getPeriodFromAnchorDate(change.start, this.anchorDate).end;
      return dayjs(changeEnd).isBetween(start, end, 'day', '[]');
    });
    return new SubscriptionPeriod({
      start,
      end,
      changes,
    });
  }
}

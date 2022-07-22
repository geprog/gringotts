import { describe, expect, it } from 'vitest';

import dayjs from '~/lib/dayjs';

import { Subscription } from './subscription';

describe('Subscription', () => {
  it('should handle simple month to month periods', () => {
    // given
    const subscription = new Subscription({
      anchorDate: new Date('2020-01-01'),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });

    // when
    const price = subscription.getPeriod(new Date('2020-01-31')).getInvoice().getPrice();

    // then
    expect(price).toStrictEqual(50);
  });

  it('should handle middle of month to middle of next month periods', () => {
    // given
    const subscription = new Subscription({
      anchorDate: new Date('2020-01-15'),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });

    // when
    const price = subscription.getPeriod(new Date('2020-02-15')).getInvoice().getPrice();

    // then
    expect(price).toStrictEqual(50);
  });

  it('should gimme money', () => {
    // given
    const subscription = new Subscription({
      anchorDate: new Date('2020-01-01'),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });
    subscription.changePlan({ pricePerUnit: 1.5, units: 50, changeDate: new Date('2020-01-16') });
    subscription.changePlan({ pricePerUnit: 2, units: 50, changeDate: new Date('2020-01-19') });

    // when
    const price = subscription.getPeriod(new Date('2020-02-01')).getInvoice().getPrice();

    // then
    expect(price).toStrictEqual(10);
  });

  it('should handle same day changes', () => {
    // given
    const subscription = new Subscription({
      anchorDate: new Date('2020-01-01'),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });
    subscription.changePlan({ pricePerUnit: 1.5, units: 50, changeDate: new Date('2020-01-16') });
    subscription.changePlan({ pricePerUnit: 2, units: 50, changeDate: new Date('2020-01-19') });
    subscription.changePlan({ pricePerUnit: 5, units: 50, changeDate: new Date('2020-01-31T18:00:00.000Z') });

    // when
    const subscriptionPeriod = subscription.getPeriod(dayjs('2020-01-31').endOf('date').toDate());
    const price = subscriptionPeriod.getInvoice().getPrice();
    console.log(subscriptionPeriod.getInvoice().toString());

    // then
    expect(price).toStrictEqual(10);
  });
});

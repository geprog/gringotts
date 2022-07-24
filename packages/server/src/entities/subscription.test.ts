import { beforeAll, describe, expect, it } from 'vitest';

import { config } from '~/config';
import { database } from '~/database';
import dayjs from '~/lib/dayjs';
import { getPeriodFromAnchorDate } from '~/utils';

import { Subscription } from './subscription';

describe('Subscription', () => {
  beforeAll(async () => {
    config.postgresUrl = 'postgres://postgres:postgres@localhost:5432/postgres'; // set to dummy value so we can init database
    await database.init();
  });

  it('should handle simple month to month periods', () => {
    // given
    const subscription = new Subscription({
      anchorDate: dayjs('2020-01-01').toDate(),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });

    // when
    const price = subscription.getPeriod(dayjs('2020-01-31').toDate()).getInvoice().getPrice();

    // then
    expect(price).toStrictEqual(50);
  });

  it('should handle middle of month to middle of next month periods', () => {
    // given
    const subscription = new Subscription({
      anchorDate: dayjs('2020-01-15').toDate(),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });

    // when
    const price = subscription.getPeriod(dayjs('2020-02-15').toDate()).getInvoice().getPrice();

    // then
    expect(price).toStrictEqual(50);
  });

  it('should handle multiple changes of units and prices', () => {
    // given
    const subscription = new Subscription({
      anchorDate: dayjs('2020-01-01').toDate(),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });
    subscription.changePlan({ pricePerUnit: 1.5, units: 50, changeDate: dayjs('2020-01-16').toDate() });
    subscription.changePlan({ pricePerUnit: 2, units: 50, changeDate: dayjs('2020-01-19').toDate() });

    // when
    const price = subscription.getPeriod(dayjs('2020-02-01').toDate()).getInvoice().getPrice();

    // then
    expect(price).toStrictEqual(100);
  });

  it('should handle same day changes', () => {
    // given
    const anchorDate = dayjs('2020-01-01').toDate();
    const subscription = new Subscription({
      anchorDate,
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });
    const { end } = getPeriodFromAnchorDate(anchorDate, anchorDate);
    subscription.changePlan({ pricePerUnit: 5, units: 50, changeDate: dayjs(end).subtract(5, 'hours').toDate() });

    // when
    const subscriptionPeriod = subscription.getPeriod(dayjs('2020-01-31').toDate());
    const price = subscriptionPeriod.getInvoice().getPrice();

    // then
    expect(price).toStrictEqual(51.34);
  });
});

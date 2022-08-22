import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '~/config';
import { database } from '~/database';
import dayjs from '~/lib/dayjs';
import { getPeriodFromAnchorDate } from '~/utils';

import { Subscription } from './subscription';
import { SubscriptionPeriod } from './subscription_period';

describe('Subscription period', () => {
  beforeAll(async () => {
    config.postgresUrl = 'postgres://postgres:postgres@localhost:5432/postgres'; // set to dummy value so we can init database
    await database.init();
  });

  it('should handle simple month to month periods', () => {
    // given
    const subscription = new Subscription({
      anchorDate: dayjs('2020-01-01').toDate(),
    });

    // when
    subscription.changePlan({ pricePerUnit: 1, units: 50 });
    const { start, end } = getPeriodFromAnchorDate(dayjs('2020-01-31').toDate(), subscription.anchorDate);
    const period = new SubscriptionPeriod(subscription, start, end);
    const invoiceItems = period.getInvoiceItems();

    // then
    expect(invoiceItems).toHaveLength(1);
    expect(invoiceItems[0].pricePerUnit).toBe(50);
    expect(invoiceItems[0].units).toBe(1);
  });

  it('should handle middle of month to middle of next month periods', () => {
    // given
    const subscription = new Subscription({
      anchorDate: dayjs('2020-01-15').toDate(),
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });

    // when
    const { start, end } = getPeriodFromAnchorDate(dayjs('2020-02-15').toDate(), subscription.anchorDate);
    const period = new SubscriptionPeriod(subscription, start, end);
    const invoiceItems = period.getInvoiceItems();

    // then
    expect(invoiceItems).toHaveLength(1);
    expect(invoiceItems[0].pricePerUnit).toBeCloseTo(50);
    expect(invoiceItems[0].units).toBe(1);
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
    const { start, end } = getPeriodFromAnchorDate(dayjs('2020-01-01').toDate(), subscription.anchorDate);
    const period = new SubscriptionPeriod(subscription, start, end);
    const invoiceItems = period.getInvoiceItems();

    // then
    expect(invoiceItems).toHaveLength(3);
  });

  it('should handle same day changes', () => {
    // given
    const anchorDate = dayjs('2020-01-01').toDate();
    const subscription = new Subscription({
      anchorDate,
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });
    const { start, end } = getPeriodFromAnchorDate(dayjs('2020-01-31').toDate(), subscription.anchorDate);
    subscription.changePlan({ pricePerUnit: 5, units: 50, changeDate: dayjs(end).subtract(5, 'hours').toDate() });

    // when
    const subscriptionPeriod = subscription.getPeriod(start, end);
    const invoiceItems = subscriptionPeriod.getInvoiceItems();

    // then
    expect(invoiceItems).toHaveLength(2);
  });

  it('should generate nice string invoices', () => {
    // given
    const anchorDate = dayjs('2020-01-01').toDate();
    const subscription = new Subscription({
      anchorDate,
    });
    subscription.changePlan({ pricePerUnit: 1, units: 50 });
    subscription.changePlan({ pricePerUnit: 1.5, units: 50, changeDate: dayjs('2020-01-16').toDate() });
    subscription.changePlan({ pricePerUnit: 2, units: 50, changeDate: dayjs('2020-01-19').toDate() });
    const { start, end } = getPeriodFromAnchorDate(dayjs('2020-01-31').toDate(), subscription.anchorDate);

    // when
    const subscriptionPeriod = subscription.getPeriod(start, end);
    const invoiceItems = subscriptionPeriod.getInvoiceItems();

    // then
    expect(invoiceItems).toHaveLength(3);
  });
});

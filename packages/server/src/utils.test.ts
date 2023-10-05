import { describe, expect, it } from 'vitest';

import dayjs from '~/lib/dayjs';

import { getActiveUntilDate, getPeriodFromAnchorDate } from './utils';

describe('utils', () => {
  const getActiveUntilDateTests = [
    // oldActiveUntil, anchorDate, activeUntil
    ['2022-01-15', '2022-01-15', '2022-02-14'],
    ['2022-02-15', '2022-01-15', '2022-03-14'],
    ['2022-01-31', '2022-01-31', '2022-02-27'],
    ['2022-02-28', '2022-01-31', '2022-03-31'],
    ['2022-03-31', '2022-01-31', '2022-04-29'],
  ];
  it.each(getActiveUntilDateTests)(
    'getActiveUntilDate oldActiveUntil: %s & anchorDate: %s => activeUntil: %s',
    (oldActiveUntil, anchorDate, expected) => {
      // when
      const activeUntil = getActiveUntilDate(dayjs(oldActiveUntil).toDate(), dayjs(anchorDate).toDate());

      // then
      expect(activeUntil).toStrictEqual(dayjs(expected).endOf('day').toDate());
    },
  );

  // For example, a customer with a monthly subscription set to cycle on the 2nd of the month will
  // always be billed on the 2nd.

  // If a month doesn’t have the anchor day, the subscription will be billed on the last day of the month.
  // For example, a subscription starting on January 31 bills on February 28 (or February 29 in a leap year),
  // then March 31, April 30, and so on.

  it.each([
    // date in some period, anchorDate, start, end
    ['2022-01-23', '2022-01-02', '2022-01-02', '2022-02-01'],
    ['2022-02-28', '2022-01-02', '2022-02-02', '2022-03-01'],
    ['2022-03-31', '2022-01-02', '2022-03-02', '2022-04-01'],
    ['2022-02-15', '2022-01-31', '2022-02-28', '2022-03-30'], // anchorDate is 31st
    ['2022-03-15', '2022-01-31', '2022-02-28', '2022-03-31'], // randomDate before anchorDate
  ])('should return the active period boundaries of %s with anchor: %s', (randomDate, anchorDate, start, end) => {
    const d = getPeriodFromAnchorDate(new Date(randomDate), new Date(anchorDate));
    expect(d.start, 'start date').toStrictEqual(dayjs(start).startOf('day').toDate());
    expect(d.end, 'end date').toStrictEqual(dayjs(end).endOf('day').toDate());
  });
});

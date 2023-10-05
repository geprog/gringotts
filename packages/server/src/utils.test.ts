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

  it.only.each([
    // randomDate, anchorDate, start, end

    // 01.01, 01.02, 01.03, 01.04
    ['2022-01-15', '2022-01-01', '2022-01-01', '2022-01-31'],
    ['2022-02-15', '2022-01-01', '2022-02-01', '2022-02-28'],

    // 15.01, 15.02, 15.03, 15.04
    ['2022-01-28', '2022-01-15', '2022-01-15', '2022-02-14'],
    ['2022-02-28', '2022-01-15', '2022-02-15', '2022-03-14'],
    ['2022-03-31', '2022-01-15', '2022-03-15', '2022-04-14'],
    ['2022-02-05', '2022-01-15', '2022-01-15', '2022-02-14'], // randomDate 5th before anchorDate 15th

    // 30.01, 28.02, 30.03, 30.04
    ['2022-02-15', '2022-01-30', '2022-01-30', '2022-02-28'],
    ['2022-03-15', '2022-01-30', '2022-02-28', '2022-03-30'],
    ['2022-03-15', '2022-01-30', '2022-02-28', '2022-03-30'], // randomDate before anchorDate

    // 31.01, 28.02, 31.03, 30.04
    ['2022-02-15', '2022-01-31', '2022-01-31', '2022-02-28'], // anchorDate is 31st
    ['2022-03-15', '2022-01-31', '2022-02-28', '2022-03-31'], // anchorDate is 31st
    ['2022-03-15', '2022-01-31', '2022-02-28', '2022-03-31'], // randomDate before anchorDate

    // 31.01, 29.02, 31.03, 30.04 (leap year)
    ['2020-02-15', '2020-01-31', '2020-01-31', '2020-02-29'], // anchorDate is 31st
  ])(
    'should return period boundaries of "%s" with anchor: "%s" => "%s - %s"',
    (randomDate, anchorDate, _start, _end) => {
      const start = dayjs(_start).startOf('day');
      const end = dayjs(_end).endOf('day');
      const d = getPeriodFromAnchorDate(new Date(randomDate), new Date(anchorDate));
      if (!start.isSame(d.start, 'day') || !end.isSame(d.end, 'day')) {
        console.log({
          anchorDate: dayjs(anchorDate).format('DD.MM.'),
          randomDate: dayjs(randomDate).format('DD.MM.'),
          exp: `${start.format('DD.MM.')} - ${end.format('DD.MM.')}`,
          got: `${dayjs(d.start).format('DD.MM.')} - ${dayjs(d.end).format('DD.MM.')}`,
        });
      }

      expect(dayjs(d.start).format('DD.MM.YYYY'), 'start date').toStrictEqual(start.format('DD.MM.YYYY'));
      expect(dayjs(d.end).format('DD.MM.YYYY'), 'end date').toStrictEqual(end.format('DD.MM.YYYY'));
      expect(dayjs(randomDate).isBetween(start, end)).toBe(true);
    },
  );
});

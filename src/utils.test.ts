import { describe, expect, it } from 'vitest';

import dayjs from '~/lib/dayjs';

import { getActiveUntilDate, getPeriodFromAnchorDate } from './utils';

describe('utils', () => {
  const getActiveUntilDateTests = [
    // oldActiveUntil, anchorDate, activeUntil
    ['2022-01-15', '2022-01-15', '2022-02-15'],
    ['2022-02-15', '2022-01-15', '2022-03-15'],
    ['2022-01-31', '2022-01-31', '2022-02-28'],
    ['2022-02-28', '2022-01-31', '2022-03-31'],
    ['2022-03-31', '2022-01-31', '2022-04-30'],
  ];
  it.each(getActiveUntilDateTests)(
    'getActiveUntilDate oldActiveUntil: %s & anchorDate: %s => activeUntil: %s',
    (oldActiveUntil, anchorDate, expected) => {
      // when
      const activeUntil = getActiveUntilDate(dayjs(oldActiveUntil).toDate(), dayjs(anchorDate).toDate());

      // then
      expect(activeUntil).toStrictEqual(dayjs(expected).toDate());
    },
  );

  it('should return the active period boundaries', () => {
    const d = getPeriodFromAnchorDate(new Date('2022-01-23'), new Date('2022-12-15'));
    expect(d.start).toStrictEqual(new Date('2022-01-15'));
    expect(d.end).toStrictEqual(new Date('2022-02-15'));

    const d1 = getPeriodFromAnchorDate(new Date('2020-02-29'), new Date('2016-12-15'));
    expect(d1.start).toStrictEqual(new Date('2020-02-15'));
    expect(d1.end).toStrictEqual(new Date('2020-03-15'));
  });
});

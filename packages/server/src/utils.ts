import dayjs from '~/lib/dayjs';

export function getPeriodFromAnchorDate(someDateInPeriod: Date, _anchorDate: Date): { start: Date; end: Date } {
  const startDate = Math.min(dayjs(someDateInPeriod).endOf('month').date(), dayjs(_anchorDate).date());

  let start = dayjs(someDateInPeriod).set('date', startDate).startOf('day');

  if (startDate > dayjs(someDateInPeriod).date()) {
    start = start.subtract(1, 'month');
  }

  const endDate = Math.min(dayjs(start.add(1, 'month')).endOf('month').date(), dayjs(_anchorDate).date());
  const end = start.add(1, 'month').set('date', endDate).subtract(1, 'day').endOf('day');

  return { start: start.toDate(), end: end.toDate() };
}

export function getActiveUntilDate(oldActiveUntil: Date, anchorDate: Date): Date {
  const { end } = getPeriodFromAnchorDate(oldActiveUntil, anchorDate);
  return end;
}

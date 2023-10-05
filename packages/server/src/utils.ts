import dayjs from '~/lib/dayjs';

export function getPeriodFromAnchorDate(someDateInPeriod: Date, _anchorDate: Date): { start: Date; end: Date } {
  const startDate = Math.min(dayjs(someDateInPeriod).endOf('month').date(), dayjs(_anchorDate).date());
  let start = dayjs(someDateInPeriod).set('date', startDate);

  if (dayjs(start).isAfter(someDateInPeriod)) {
    const end = start.endOf('day');
    console.log(start.format('DD.MM.'));
    // select previous month
    console.log('select prev');
    const d = dayjs(start).subtract(1, 'month');
    console.log(d.format('DD.MM.'));
    const date = Math.max(d.endOf('month').date(), d.date());
    start = dayjs(d).set('date', date);
    console.log(start.format('DD.MM.'));

    return { start: start.toDate(), end: end.toDate() };
  }

  const endDate = Math.min(start.add(1, 'month').endOf('month').date(), dayjs(_anchorDate).date());
  const end = start.add(1, 'month').endOf('month').set('date', endDate).subtract(1, 'day').endOf('day');

  return { start: start.toDate(), end: end.toDate() };
}

export function getActiveUntilDate(oldActiveUntil: Date, anchorDate: Date): Date {
  const { end } = getPeriodFromAnchorDate(oldActiveUntil, anchorDate);
  return end;
}

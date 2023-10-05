import dayjs from '~/lib/dayjs';

export function getPeriodFromAnchorDate(someDateInPeriod: Date, _anchorDate: Date): { start: Date; end: Date } {
  const startDate = Math.min(dayjs(someDateInPeriod).endOf('month').date(), dayjs(_anchorDate).date());
  let start = dayjs(someDateInPeriod).set('date', startDate).startOf('day');

  if (start.isAfter(someDateInPeriod)) {
    // select previous period
    let end = start.endOf('day');
    const newStart = start.subtract(1, 'month');
    let date = Math.max(newStart.date(), dayjs(_anchorDate).date());
    date = Math.min(date, newStart.endOf('month').date());
    if (date === start.date()) {
      end = start.subtract(1, 'day').endOf('day');
    }
    start = newStart.set('date', date);
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

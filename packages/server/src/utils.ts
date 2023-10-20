import dayjs from '~/lib/dayjs';

export function getPeriodFromAnchorDate(someDateInPeriod: Date, anchorDate: Date): { start: Date; end: Date } {
  const startDate = Math.min(dayjs(someDateInPeriod).endOf('month').date(), dayjs(anchorDate).date());
  let start = dayjs(someDateInPeriod).set('date', startDate).startOf('day');

  if (start.isAfter(someDateInPeriod)) {
    // select previous period
    const newStart = start.subtract(1, 'month');
    let date = Math.max(newStart.date(), dayjs(anchorDate).date());
    date = Math.min(date, newStart.endOf('month').date());
    start = newStart.set('date', date);
  }

  const endDate = Math.min(start.add(1, 'month').endOf('month').date(), dayjs(anchorDate).date());
  const end = start.add(1, 'month').endOf('month').set('date', endDate).subtract(1, 'day').endOf('day');

  return { start: start.toDate(), end: end.toDate() };
}

export function getNextPeriod(someDateInPeriod: Date, anchorDate: Date): { start: Date; end: Date } {
  const { end } = getPeriodFromAnchorDate(someDateInPeriod, anchorDate);
  return getPeriodFromAnchorDate(dayjs(end).add(1, 'day').toDate(), anchorDate);
}

export function getPreviousPeriod(nextPayment: Date, anchorDate: Date): { start: Date; end: Date } {
  const { start } = getPeriodFromAnchorDate(nextPayment, anchorDate);
  return getPeriodFromAnchorDate(dayjs(start).subtract(1, 'day').toDate(), anchorDate);
}

export function getActiveUntilDate(oldActiveUntil: Date, anchorDate: Date): Date {
  const { end } = getPeriodFromAnchorDate(oldActiveUntil, anchorDate);
  return end;
}

export function getNextPaymentDate(currentNextPayment: Date, anchorDate: Date): Date {
  const { start } = getNextPeriod(currentNextPayment, anchorDate);
  return dayjs(start).add(1, 'hour').toDate(); // add short buffer
}

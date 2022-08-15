import dayjs from '~/lib/dayjs';

export function getActiveUntilDate(oldActiveUntil: Date, anchorDate: Date): Date {
  const anchorDay = Math.min(dayjs(oldActiveUntil).add(1, 'month').endOf('month').date(), dayjs(anchorDate).date());
  return dayjs(oldActiveUntil).add(1, 'month').set('date', anchorDay).toDate();
}

export function getPeriodFromAnchorDate(someDateInPeriod: Date, anchorDate: Date): { start: Date; end: Date } {
  const anchorDay = Math.min(dayjs(someDateInPeriod).endOf('month').date(), dayjs(anchorDate).date());
  return {
    start: dayjs(someDateInPeriod).set('date', anchorDay).toDate(),
    end: dayjs(someDateInPeriod).add(1, 'month').set('date', anchorDay).toDate(),
  };
}

export function getNextPeriodFromDate(date: Date, anchorDate: Date): { start: Date; end: Date } {
  const anchorDay = Math.min(dayjs(date).add(1, 'month').endOf('month').date(), dayjs(anchorDate).date());
  const nextDate = dayjs(date).add(1, 'month').set('date', anchorDay).toDate();
  return {
    start: dayjs(nextDate).set('date', anchorDay).toDate(),
    end: dayjs(nextDate).add(1, 'month').set('date', anchorDay).toDate(),
  };
}

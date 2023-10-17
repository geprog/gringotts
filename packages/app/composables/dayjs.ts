import dayjs from 'dayjs';

export function formatTime(date: Date) {
  return dayjs(date).format('HH:mm');
}

export function formatDate(date: Date) {
  return dayjs(date).format('DD.MM.YYYY');
}

export function formatDateTime(date: Date) {
  return dayjs(date).format('DD.MM.YYYY HH:mm');
}

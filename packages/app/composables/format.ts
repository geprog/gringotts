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

export function formatCurrency(amount: number, currency: string) {
  switch (currency) {
    case 'EUR':
      return `${amount.toFixed(2)} €`;
    case 'USD':
      return `$${amount.toFixed(2)}`;
    default:
      return `${amount.toFixed(2)} ${currency}`;
  }
}

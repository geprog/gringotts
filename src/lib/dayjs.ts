import dayjs from 'dayjs';
import dayjsIsBetween from 'dayjs/plugin/isBetween';
import dayjsMinMax from 'dayjs/plugin/minMax';

dayjs.extend(dayjsMinMax);
dayjs.extend(dayjsIsBetween);

export default dayjs;

export function formatDate(date: Date): string {
  return dayjs(date).format('DD.MM.YYYY');
}

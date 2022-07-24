import dayjs from 'dayjs';
import dayjsCustomParseFormat from 'dayjs/plugin/customParseFormat';
import dayjsIsBetween from 'dayjs/plugin/isBetween';
import dayjsMinMax from 'dayjs/plugin/minMax';

dayjs.extend(dayjsCustomParseFormat);
dayjs.extend(dayjsMinMax);
dayjs.extend(dayjsIsBetween);

export default dayjs;

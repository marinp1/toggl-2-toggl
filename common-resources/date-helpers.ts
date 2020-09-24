import { formatDistance, formatISO } from 'date-fns';

export const generateDateString = (date: Date | number) => {
  const readable = formatDistance(date, Date.now(), { addSuffix: true });
  return `${formatISO(date)} (${readable})`;
};

export const generateDateString = (date: Date | number) =>
  Promise.all([
    import('date-fns/formatDistance').then((mod) => mod.default),
    import('date-fns/formatISO').then((mod) => mod.default),
  ]).then(([formatDistance, formatISO]) => {
    const readable = formatDistance(date, Date.now(), { addSuffix: true });
    return `${formatISO(date)} (${readable})`;
  });

import * as _ from 'lodash';
import { TogglApiError, ITogglEntry } from '@types';

export const generateApiQueryString = (req: object): string =>
  Object.entries(req)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');

export const isTogglApiError = (res: object): res is TogglApiError => {
  return !!(res as TogglApiError).error;
};

const combineEntries = (e1: ITogglEntry, e2: ITogglEntry): ITogglEntry[] => {
  if (
    !e1.stopDateTime ||
    !e2.stopDateTime ||
    e1.isThesisEntry ||
    e2.isThesisEntry
  ) {
    return [e1, e2];
  }

  const timeDifference = Math.abs(
    Date.parse(e1.stopDateTime) - Date.parse(e2.startDateTime),
  );
  if (timeDifference > 60 * 1000) {
    return [e1, e2];
  }

  return [
    {
      id: `${e1.id}-${e2.id}`,
      isThesisEntry: false,
      description: e1.description,
      secondsLogged: e1.secondsLogged + e2.secondsLogged,
      running: false,
      status: 'created',
      startDateTime: String(e1.startDateTime),
      stopDateTime: e2.stopDateTime,
      updateDateTime: new Date().toISOString(),
    },
  ];
};

export const reduceEntries = (entries: ITogglEntry[]) => {
  return _.sortBy(entries, e => e.startDateTime)
    .filter(d => !d.running)
    .reduce<ITogglEntry[]>((prev, cur) => {
      const last = _.last(prev);
      if (!last) {
        return prev.concat(cur);
      } else {
        const combined = combineEntries(last, cur);
        if (combined.length === 2) {
          return prev.concat(cur);
        }
        return _.dropRight(prev, 1).concat(combined);
      }
    }, []);
};

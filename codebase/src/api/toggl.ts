/* eslint-disable @typescript-eslint/camelcase */
import * as _ from 'lodash';
import axios from 'axios';

import { generateApiQueryString, isTogglApiError } from '@utils/api';

import {
  TogglGetTimeEntriesBody,
  TogglTimeEntryBody,
  TogglApiPlainResponse,
  ITogglEntry,
} from '@types';
import db from 'src/db';

const TOGGL_API_BASE_URL = 'https://www.toggl.com/api/v8';

const { TOGGL_THESIS_PROJECT_ID_FROM } = process.env;

if (!TOGGL_THESIS_PROJECT_ID_FROM) {
  throw new Error(`Missing environment variable TOGGL_THESIS_PROJECT_ID_FROM`);
}

const setupAxios = (baseUrl: string): void => {
  const { TOGGL_API_TOKEN_FROM } = process.env;
  if (!TOGGL_API_TOKEN_FROM) {
    throw new Error(`Missing environment variable TOGGL_API_TOKEN_FROM`);
  }

  axios.defaults.auth = {
    username: TOGGL_API_TOKEN_FROM,
    password: 'api_token',
  };

  axios.defaults.baseURL = baseUrl;
};

const getDescription = (e: TogglTimeEntryBody): string => {
  if (e.pid && String(e.pid) === TOGGL_THESIS_PROJECT_ID_FROM) {
    return e.description;
  }
  return 'Work at the office';
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

const getTogglEntries = async (parameters: {
  startDate: Date;
  endDate: Date;
}): Promise<ITogglEntry[]> => {
  setupAxios(TOGGL_API_BASE_URL);

  const req: TogglGetTimeEntriesBody = {
    start_date: encodeURIComponent(parameters.startDate.toISOString()),
    end_date: encodeURIComponent(parameters.endDate.toISOString()),
  };

  const qs = generateApiQueryString(req);
  const { data } = await axios.get<TogglApiPlainResponse<TogglTimeEntryBody[]>>(
    `/time_entries?${qs}`,
  );

  if (isTogglApiError(data)) {
    // eslint-disable-next-line no-console
    console.log(data.error);
    throw new Error('Toggl API Error');
  }

  const sorted: ITogglEntry[] = _.sortBy(
    data.map(d => ({
      id: String(d.id),
      isThesisEntry: !!(
        d.pid && String(d.pid) === TOGGL_THESIS_PROJECT_ID_FROM
      ),
      description: getDescription(d),
      secondsLogged: d.duration,
      running: d.duration < 0,
      status: 'created',
      startDateTime: String(d.start),
      stopDateTime: d.stop,
      updateDateTime: d.at,
    })),
    e => e.startDateTime,
  );

  const reduced = sorted
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

  return reduced;
};

export default {
  getTogglEntries,
};

/* eslint-disable @typescript-eslint/camelcase */
import * as _ from 'lodash';
import axios from 'axios';

import { generateApiQueryString, isTogglApiError } from '@utils/api';

import {
  TogglGetTimeEntriesBody,
  TogglTimeEntryBody,
  TogglTimeEntryBodyRequest,
  TogglApiResponse,
  TogglApiPlainResponse,
  ITogglEntry,
  ITimeEntry,
} from '@types';

const TOGGL_API_BASE_URL = 'https://www.toggl.com/api/v8';

const {
  TOGGL_THESIS_PROJECT_ID_FROM,
  TOGGL_THESIS_PROJECT_ID_TO,
  TOGGL_WORK_PROJECT_ID_TO,
} = process.env;

if (!TOGGL_THESIS_PROJECT_ID_FROM) {
  throw new Error(`Missing environment variable TOGGL_THESIS_PROJECT_ID_FROM`);
} else if (!TOGGL_THESIS_PROJECT_ID_TO) {
  throw new Error(`Missing environment variable TOGGL_THESIS_PROJECT_ID_TO`);
} else if (!TOGGL_WORK_PROJECT_ID_TO) {
  throw new Error(`Missing environment variable TOGGL_WORK_PROJECT_ID_TO`);
}

const setupAxios = (baseUrl: string, account: 'to' | 'from'): void => {
  const { TOGGL_API_TOKEN_FROM, TOGGL_API_TOKEN_TO } = process.env;

  if (!TOGGL_API_TOKEN_FROM || !TOGGL_API_TOKEN_TO) {
    throw new Error(
      `Missing environment variable TOGGL_API_TOKEN_FROM or TOGGL_API_TOKEN_TO`,
    );
  }

  const username =
    account === 'from' ? TOGGL_API_TOKEN_FROM : TOGGL_API_TOKEN_TO;

  axios.defaults.auth = {
    username: username,
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

const mapTogglResponse = (d: TogglTimeEntryBody): ITogglEntry => ({
  id: String(d.id),
  isThesisEntry: !!(d.pid && String(d.pid) === TOGGL_THESIS_PROJECT_ID_FROM),
  description: getDescription(d),
  secondsLogged: d.duration,
  running: d.duration < 0,
  status: 'created',
  startDateTime: String(d.start),
  stopDateTime: d.stop,
  updateDateTime: d.at,
});

const getTogglEntries = async (parameters: {
  startDate: Date;
  endDate: Date;
}): Promise<ITogglEntry[]> => {
  setupAxios(TOGGL_API_BASE_URL, 'from');

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
    data.map(mapTogglResponse),
    e => e.startDateTime,
  );

  return sorted;
};

const createTogglEntry = async (entry: ITimeEntry): Promise<ITogglEntry> => {
  setupAxios(TOGGL_API_BASE_URL, 'to');

  const req: TogglTimeEntryBodyRequest = {
    time_entry: {
      description: entry.description,
      pid: entry.isThesisEntry
        ? Number(TOGGL_THESIS_PROJECT_ID_TO)
        : Number(TOGGL_WORK_PROJECT_ID_TO),
      start: entry.startDateTime.toISOString(),
      stop: entry.endDateTime.toISOString(),
      duration: entry.secondsLogged,
      created_with: 'Toggl2Toggl by Patrik Marin',
      tags: entry.isThesisEntry ? ["Master's Thesis"] : [],
    },
  };

  const { data } = await axios.post<TogglApiResponse<TogglTimeEntryBody>>(
    '/time_entries',
    req,
  );

  if (isTogglApiError(data)) {
    // eslint-disable-next-line no-console
    console.log(data.error);
    throw new Error('Toggl API Error');
  }

  return mapTogglResponse(data.data);
};

const updateTogglEntry = async (entry: ITimeEntry): Promise<ITogglEntry> => {
  setupAxios(TOGGL_API_BASE_URL, 'to');

  if (!entry.createdEntry) {
    throw new Error('Missing entry link!');
  }

  const req: TogglTimeEntryBodyRequest = {
    time_entry: {
      description: entry.description,
      pid: entry.isThesisEntry
        ? Number(TOGGL_THESIS_PROJECT_ID_TO)
        : Number(TOGGL_WORK_PROJECT_ID_TO),
      start: entry.startDateTime.toISOString(),
      stop: entry.endDateTime.toISOString(),
      duration: entry.secondsLogged,
      created_with: 'Toggl2Toggl by Patrik Marin',
      tags: entry.isThesisEntry ? ["Master's Thesis"] : [],
    },
  };

  const { data } = await axios.post<TogglApiResponse<TogglTimeEntryBody>>(
    `/time_entries/${entry.createdEntry.id}`,
    req,
  );

  if (isTogglApiError(data)) {
    // eslint-disable-next-line no-console
    console.log(data.error);
    throw new Error('Toggl API Error');
  }

  return mapTogglResponse(data.data);
};

export default {
  getTogglEntries,
  createTogglEntry,
  updateTogglEntry,
};

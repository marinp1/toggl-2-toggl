/* eslint-disable @typescript-eslint/camelcase */
import axios from 'axios';

import { generateApiQueryString, isTogglApiError } from '@utils/api';

import {
  TogglGetTimeEntriesBody,
  TogglTimeEntryBody,
  TogglApiResponse,
  ITogglEntry,
} from '@types';

const TOGGL_API_BASE_URL = 'https://toggl.com/api/v8';
const TOGGL_API_BASE_URL_ENTRIES = `${TOGGL_API_BASE_URL}/time_entries`;

const { TOGGL_WORKSPACE_ID_FROM } = process.env;

if (!TOGGL_WORKSPACE_ID_FROM) {
  throw new Error(`Missing environment variable TOGGL_WORKSPACE_ID_FROM`);
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

const getTogglEntries = async (parameters: {
  startDate: Date;
  endDate: Date;
}): Promise<ITogglEntry[]> => {
  setupAxios(TOGGL_API_BASE_URL_ENTRIES);

  const req: TogglGetTimeEntriesBody = {
    start_date: parameters.startDate.toISOString(),
    end_date: parameters.endDate.toISOString(),
  };

  const qs = generateApiQueryString(req);
  const { data } = await axios.get<TogglApiResponse<TogglTimeEntryBody[]>>(
    `?${qs}`,
  );

  if (isTogglApiError(data)) {
    // eslint-disable-next-line no-console
    console.log(data.error);
    throw new Error('Toggl API Error');
  }

  return data.data.map(d => ({
    id: String(d.id),
    secondsLogged: d.duration,
    running: d.duration < 0,
    status: 'updated',
    updateDateTime: d.at,
  }));
};

export default {
  getTogglEntries,
};

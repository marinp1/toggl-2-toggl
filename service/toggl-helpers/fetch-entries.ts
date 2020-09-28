import { prepareApi } from 'toggl-api/prepare-api';
import { getLatest } from 'toggl-api/time-entries';

export const fetchLatestTogglEntries = async (params: {
  apiToken: string;
  days: number;
}) => {
  const { apiToken, days } = params;
  const getLatestEntries = prepareApi(getLatest, apiToken);
  return getLatestEntries(days);
};

import { prepareApi, getLatest } from 'toggl-api';

export const fetchLatestTogglEntries = async (params: {
  apiToken: string;
  days: number;
}) => {
  const { apiToken, days } = params;
  const getLatestEntries = prepareApi(getLatest, apiToken);
  return getLatestEntries(days);
};

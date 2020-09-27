import { TogglError } from 'service/errors';
import { ApiMethod, TimeEntryResponse, TimeEntryRequest } from '../types';

export const createEntry: ApiMethod<
  Record<string, TimeEntryResponse>,
  [string, TimeEntryRequest]
> = (apiCall) => async (mappedFrom, entry) => {
  const response = await apiCall.post<TimeEntryResponse>(
    'https://api.track.toggl.com/api/v8/time_entries',
    entry,
  );

  if (response.error)
    throw new TogglError(
      `Failed to create entry from ID ${mappedFrom}`,
      response.error.statusCode,
    );

  return {
    [mappedFrom]: response.data,
  };
};

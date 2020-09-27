import { TogglError } from 'service/errors';
import { ApiMethod, TimeEntryResponse, TimeEntryRequest } from '../types';
import { EnrichedWithMap } from 'service/types';

export const updateEntry: ApiMethod<
  Record<string, TimeEntryResponse>,
  [string, EnrichedWithMap<TimeEntryRequest>]
> = (apiCall) => async (entryId, entry) => {
  const response = await apiCall.put<TimeEntryResponse>(
    `https://api.track.toggl.com/api/v8/time_entries/${entry.__mappedTo}`,
    entry,
  );

  if (response.error)
    throw new TogglError(
      `Failed to update entry ${entry.__mappedTo} -- mapped from ${entryId}`,
      response.error.statusCode,
    );

  return {
    [entryId]: response.data,
  };
};

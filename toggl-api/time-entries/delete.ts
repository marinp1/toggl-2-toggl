import { TogglError } from 'service/errors';
import { ApiMethod, TimeEntryResponse, TimeEntryRequest } from '../types';

export const deleteEntry: ApiMethod<string, [string, string]> = (
  apiCall,
) => async (entryId, mappedEntryId) => {
  const response = await apiCall.delete(
    `https://api.track.toggl.com/api/v8/time_entries/${mappedEntryId}`,
  );

  if (response.error)
    throw new TogglError(
      `Failed to delete entry ${mappedEntryId} -- mapped from ${entryId}`,
      response.error.statusCode,
    );

  return entryId;
};

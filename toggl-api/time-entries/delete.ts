import { TogglError } from 'service/errors';
import { ApiMethod, TimeEntryResponse, TimeEntryRequest } from '../types';

export const deleteEntry: ApiMethod<string, [string]> = (apiCall) => async (
  entryId,
) => {
  const response = await apiCall.delete(
    `https://api.track.toggl.com/api/v8/time_entries/${entryId}`,
  );

  if (response.error)
    throw new TogglError(
      `Failed to delete entry ${entryId}`,
      response.error.statusCode,
    );

  return entryId;
};

import { TogglError } from 'service/errors';
import { ApiMethod, TimeEntryResponse } from '../types';

export const get: ApiMethod<TimeEntryResponse, [string]> = (apiCall) => async (
  id,
) => {
  const response = await apiCall.get<TimeEntryResponse>(
    `https://api.track.toggl.com/api/v8/time_entries/${id}`,
  );

  if (response.error)
    throw new TogglError(
      `Failed to get entry with id ${id}`,
      response.error.statusCode,
    );
  return response.data;
};

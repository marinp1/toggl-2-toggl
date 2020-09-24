import { ApiMethod, TimeEntryResponse } from '../types';

export const get: ApiMethod<TimeEntryResponse, [string]> = (apiCall) => async (
  id,
) => {
  try {
    return apiCall.get<TimeEntryResponse>(
      `https://api.track.toggl.com/api/v8/time_entries/${id}`,
    );
  } catch (e) {
    console.error(e);
    throw new Error('Failed to create entry');
  }
};

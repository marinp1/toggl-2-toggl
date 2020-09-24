import { ApiMethod, TimeEntryResponse, TimeEntryRequest } from '../types';

export const create: ApiMethod<TimeEntryResponse, [TimeEntryRequest]> = (
  apiCall,
) => async (entry) => {
  try {
    return apiCall.post<TimeEntryResponse>(
      'https://api.track.toggl.com/api/v8/time_entries',
      entry,
    );
  } catch (e) {
    console.error(e);
    throw new Error('Failed to create entry');
  }
};

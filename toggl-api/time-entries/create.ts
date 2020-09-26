import { TogglError } from 'service/errors';
import { ApiMethod, TimeEntryResponse, TimeEntryRequest } from '../types';

export const create: ApiMethod<TimeEntryResponse, [TimeEntryRequest]> = (
  apiCall,
) => async (entry) => {
  const response = await apiCall.post<TimeEntryResponse>(
    'https://api.track.toggl.com/api/v8/time_entries',
    entry,
  );

  if (response.error)
    throw new TogglError('Failed to create entry', response.error.statusCode);
  return response.data;
};

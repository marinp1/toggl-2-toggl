import { TogglError, InvalidRequestError } from 'service/errors';
import { formatRFC3339 } from 'date-fns';
import { ApiMethod, TimeEntryResponse } from '../types';

export const getBetween: ApiMethod<
  TimeEntryResponse[],
  [{ startDate: Date | number; endDate: Date | number }]
> = (apiCall) => async (params) => {
  const { startDate, endDate } = params;

  const sd = encodeURIComponent(formatRFC3339(startDate));
  const ed = encodeURIComponent(formatRFC3339(endDate));

  const response = await apiCall.getMultiple<TimeEntryResponse>(
    `https://api.track.toggl.com/api/v8/time_entries?start_date=${sd}&end_date=${ed}`,
  );

  if (response.error)
    throw new TogglError(
      `Failed to get entries between ${formatRFC3339(
        startDate,
      )} and ${formatRFC3339(endDate)}`,
      response.error.statusCode,
    );

  return response.data;
};

export const getLatest: ApiMethod<TimeEntryResponse[], [number]> = (
  apiCall,
) => async (numberOfDays) => {
  try {
    if (numberOfDays < 1 || numberOfDays > 7) {
      throw new InvalidRequestError('numberOfDays should be 1...7', -1);
    }

    const now = Date.now();
    return getBetween(apiCall)({
      startDate: now - 86400 * 1000 * numberOfDays,
      endDate: now,
    });
  } catch (e) {
    console.error(e);
    throw new TogglError(
      `Failed to get entries from last ${numberOfDays} days`,
      500,
    );
  }
};

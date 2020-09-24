import { formatRFC3339 } from 'date-fns';
import { ApiMethod, TimeEntryResponse } from '../types';

export const getBetween: ApiMethod<
  TimeEntryResponse[],
  [{ startDate: Date | number; endDate: Date | number }]
> = (apiCall) => async (params) => {
  const { startDate, endDate } = params;
  try {
    const sd = encodeURIComponent(formatRFC3339(startDate));
    const ed = encodeURIComponent(formatRFC3339(endDate));
    return apiCall.getMultiple<TimeEntryResponse>(
      `https://api.track.toggl.com/api/v8/time_entries?start_date=${sd}&end_date=${ed}`,
    );
  } catch (e) {
    console.error(e);
    throw new Error(
      `Failed to get entries between ${formatRFC3339(
        startDate,
      )} and ${formatRFC3339(endDate)}`,
    );
  }
};

export const getLatest: ApiMethod<TimeEntryResponse[], [number]> = (
  apiCall,
) => async (numberOfDays) => {
  try {
    if (numberOfDays < 1 || numberOfDays > 7) {
      throw new Error('numberOfDays should be 1...7');
    }
    const now = Date.now();
    return getBetween(apiCall)({
      startDate: now - 86400 * numberOfDays,
      endDate: now,
    });
  } catch (e) {
    console.error(e);
    throw new Error(`Failed to get entries from last ${numberOfDays} days`);
  }
};

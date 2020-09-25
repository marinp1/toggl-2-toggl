import { prepareApi, getLatest } from 'toggl-api';
import { successResponse } from 'service';

import { LambdaEvent, LambdaResponse } from 'service/types';
import { TimeEntryResponse } from 'toggl-api/types';

export const fetchLatestEntries = async (
  event: LambdaEvent,
): LambdaResponse<TimeEntryResponse[]> => {
  const { api_token } = event.pathParameters;
  const getLatestEntries = prepareApi(getLatest, api_token);
  const entries = await getLatestEntries(7);
  return successResponse(entries);
};

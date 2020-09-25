import { prepareApi, getLatest } from 'toggl-api';
import { successResponse } from 'common-resources';

import { LambdaEvent, LambdaResponse } from 'common-resources/types';
import { TimeEntryResponse, ApiMethod } from 'toggl-api/types';

export const fetchLatestEntries = async (
  event: LambdaEvent,
): LambdaResponse<TimeEntryResponse[]> => {
  const { api_token } = event.pathParameters;
  const getLatestEntries = prepareApi(getLatest, api_token);
  const entries = await getLatestEntries(7);
  return successResponse(entries);
};

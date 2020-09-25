import {
  successResponse,
  getSSMParameters,
  fetchLatestTogglEntries,
} from 'service';

import { LambdaEvent, LambdaResponse } from 'service/types';
import { TimeEntryResponse } from 'toggl-api/types';

interface FetchLatestEntriesResponse {
  sourceEntries: TimeEntryResponse[];
  targetEntries: TimeEntryResponse[];
}

export const fetchLatestEntries = async (
  event: LambdaEvent,
): LambdaResponse<FetchLatestEntriesResponse> => {
  // 1. Get active tasks from dynamo
  // 2. Get SSM parameters related tasks
  // 3. Handle sync

  const ssmNames = ['API_TOKEN_WORK', 'API_TOKEN_PERSONAL'] as const;
  const ssmValues = await getSSMParameters(...ssmNames);

  const [sourceEntries, targetEntries] = await Promise.all(
    ssmNames.map(async (name) =>
      fetchLatestTogglEntries({
        apiToken: ssmValues[name],
        days: 3,
      }),
    ),
  );

  return successResponse({
    sourceEntries,
    targetEntries,
  });
};

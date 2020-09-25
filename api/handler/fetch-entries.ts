import {
  successResponse,
  getSSMParameters,
  fetchLatestTogglEntries,
} from 'service';

import { LambdaEvent, LambdaResponse } from 'service/types';
import { TimeEntryResponse } from 'toggl-api/types';

interface FetchLatestEntriesResponse {
  existingEntries: TimeEntryResponse[];
  newEntries: TimeEntryResponse[];
  deletedEntries: TimeEntryResponse[];
}

const parseEntries = async ({
  sourceEntries,
  targetEntries,
}: Record<'sourceEntries' | 'targetEntries', TimeEntryResponse[]>) => {
  const iteratee = ({ start, duration }: TimeEntryResponse) =>
    `${start}${duration}`;

  const sourceList = new Set(sourceEntries.map(iteratee));
  const targetList = new Set(targetEntries.map(iteratee));
  const intersectionList = new Set(
    [...sourceList].filter((x) => targetList.has(x)),
  );

  const [newEntries, deletedEntries, existingEntries] = await Promise.all([
    Promise.resolve(
      sourceEntries.filter((x) => !intersectionList.has(iteratee(x))),
    ),
    Promise.resolve(
      targetEntries.filter((x) => !intersectionList.has(iteratee(x))),
    ),
    Promise.resolve(
      [...sourceEntries, ...targetEntries].filter((x) =>
        intersectionList.has(iteratee(x)),
      ),
    ),
  ]);

  return {
    existingEntries,
    newEntries,
    deletedEntries,
  };
};

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
      }).then((entries) => entries.filter((entry) => entry.duration > 0)),
    ),
  );

  const parsedEntries = await parseEntries({
    sourceEntries,
    targetEntries,
  });

  return successResponse(parsedEntries);
};

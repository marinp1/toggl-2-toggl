import {
  successResponse,
  errorResponse,
  getSSMParameters,
  fetchLatestTogglEntries,
  queryDynamoTableGSI,
} from 'service';

import { LambdaEvent, LambdaResponse, DynamoTaskRow } from 'service/types';
import { TimeEntryResponse } from 'toggl-api/types';

interface FetchLatestEntriesResponse {
  [label: string]: {
    existingEntries: TimeEntryResponse[];
    newEntries: TimeEntryResponse[];
    deletedEntries: TimeEntryResponse[];
  };
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
  try {
    // 1. Get active tasks from dynamo
    // 2. Get SSM parameters related tasks
    // 3. Handle sync

    const activeProcesses = await queryDynamoTableGSI<DynamoTaskRow>({
      tableName: process.env.DYNAMO_TASKS_TABLE_NAME,
      gsiName: 'active',
      valueToFind: 1,
    });

    // Get unique list of SSM secret names
    const allSSMNames = [
      ...new Set(
        activeProcesses
          .map((ap) => [ap.sourceApiKeySSMRef, ap.targetApiKeySSMRef])
          .flat(),
      ),
    ];

    // Fetch SSM parameters
    const ssmValues = await getSSMParameters(...allSSMNames);

    // Fetch toggl entries parallel
    const togglEntries = (
      await Promise.all(
        allSSMNames.map(async (ssmName) => ({
          [ssmName]: await fetchLatestTogglEntries({
            apiToken: ssmValues[ssmName],
            days: 3,
          }).then((entries) => entries.filter((entry) => entry.duration > 0)),
        })),
      )
    ).reduce((acc, cur) => ({ ...acc, ...cur }), {});

    // Parse entries parallel
    const parsedEntries = (
      await Promise.all(
        activeProcesses.map(
          async ({ sourceApiKeySSMRef, targetApiKeySSMRef, label }) => {
            return {
              [label || 'unlabeled']: await parseEntries({
                sourceEntries: togglEntries[sourceApiKeySSMRef],
                targetEntries: togglEntries[targetApiKeySSMRef],
              }),
            };
          },
        ),
      )
    ).reduce((acc, cur) => ({ ...acc, ...cur }), {});

    // Get mapping from dynamo DB and filter
    // 1. fetch mapping for source entries
    // 2. override

    // Get entries from dynamo and decide case
    // 1. sourceEntries -- check if exists
    //    if exists:
    //        check if has been modified (updatedAt in toggl > updatedAt in dynamo)
    //        if modified:
    //          CASE - UPDATE
    //        else:
    //          CASE - SKIP
    //    else:
    //      CASE - CREATE
    // 2. targetEntries -- check if exists
    //    if exists:
    //       CASE - SKIP
    //    else:
    //       CASE - DELETE

    return successResponse(parsedEntries);
  } catch (err) {
    return errorResponse(err);
  }
};

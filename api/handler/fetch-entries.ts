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
    status: 'OK' | 'FAILURE';
    error?: string;
    existingEntries?: TimeEntryResponse[];
    newEntries?: TimeEntryResponse[];
    deletedEntries?: TimeEntryResponse[];
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

    const activeProcesses = (
      await queryDynamoTableGSI<DynamoTaskRow>({
        tableName: process.env.DYNAMO_TASKS_TABLE_NAME,
        gsiName: 'active',
        valueToFind: 1,
      })
    ).reduce<Record<string, DynamoTaskRow>>(
      (acc, cur, ind) => ({
        ...acc,
        [cur.label || `unlabeled-${ind + 1}`]: cur,
      }),
      {},
    );

    // Get task results in parallel
    const taskResults = await Promise.allSettled(
      Object.entries(activeProcesses).map<Promise<FetchLatestEntriesResponse>>(
        async ([label, { sourceApiKeySSMRef, targetApiKeySSMRef }]) => {
          try {
            const ssmValues = await getSSMParameters(
              sourceApiKeySSMRef,
              targetApiKeySSMRef,
            );

            const [sourceEntries, targetEntries] = await Promise.all(
              [sourceApiKeySSMRef, targetApiKeySSMRef].map(async (ssmName) =>
                (
                  await fetchLatestTogglEntries({
                    apiToken: ssmValues[ssmName],
                    days: 3,
                  })
                ).filter((entry) => entry.duration > 0),
              ),
            );

            return {
              [label]: {
                status: 'OK',
                ...(await parseEntries({
                  sourceEntries: sourceEntries,
                  targetEntries: targetEntries,
                })),
              },
            };
          } catch (e) {
            console.error(e);
            return Promise.reject({
              [label]: {
                status: 'FAILURE',
                error: e.message,
              },
            });
          }
        },
      ),
    );

    // Combine results
    const response = taskResults.reduce<FetchLatestEntriesResponse>(
      (acc, taskResult) => {
        const data =
          taskResult.status === 'fulfilled'
            ? taskResult.value
            : taskResult.reason;
        return { ...acc, ...data };
      },
      {},
    );

    return successResponse(response);

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
  } catch (err) {
    return errorResponse(err);
  }
};

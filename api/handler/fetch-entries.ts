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
  successes: Array<{
    [label: string]: {
      existingEntries?: TimeEntryResponse[];
      newEntries?: TimeEntryResponse[];
      deletedEntries?: TimeEntryResponse[];
    };
  }>;
  failures: Array<Record<string, string>>;
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
    )
      .filter((ap) => !!ap.label)
      .reduce<Record<string, DynamoTaskRow>>(
        (acc, cur) => ({
          ...acc,
          [cur.label]: cur,
        }),
        {},
      );

    const taskResults = await Promise.allSettled(
      Object.entries(activeProcesses).map(
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
                ...(await parseEntries({
                  sourceEntries: sourceEntries,
                  targetEntries: targetEntries,
                })),
              },
            };
          } catch (e) {
            console.error(e);
            return Promise.reject({ [label]: e.message });
          }
        },
      ),
    );

    const response = taskResults.reduce<FetchLatestEntriesResponse>(
      (acc, taskResult) => {
        if (taskResult.status === 'fulfilled')
          acc.successes.push(taskResult.value);
        if (taskResult.status === 'rejected')
          acc.failures.push(taskResult.reason);
        return acc;
      },
      {
        successes: [],
        failures: [],
      },
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

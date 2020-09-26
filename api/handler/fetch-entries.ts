import {
  successResponse,
  errorResponse,
  getSSMParameters,
  fetchLatestTogglEntries,
  queryDynamoTableGSI,
  batchGetDynamoItems,
} from 'service';

import {
  LambdaEvent,
  LambdaResponse,
  DynamoTaskRow,
  DynamoEntryRow,
} from 'service/types';
import { TimeEntryResponse } from 'toggl-api/types';

Array.prototype.intersectBy = function(arr, iteratee) {
  const setA = new Set(this.map(iteratee));
  const setB = new Set(arr.map(iteratee));
  const intersectionList = new Set([...setA].filter((x) => setB.has(x)));
  return this.filter((x) => intersectionList.has(iteratee(x)));
};

Array.prototype.differenceBy = function(arr, iteratee) {
  const setA = new Set(this.map(iteratee));
  const setB = new Set(arr.map(iteratee));
  const intersectionList = new Set([...setA].filter((x) => setB.has(x)));
  return this.filter((x) => !intersectionList.has(iteratee(x)));
};

interface FetchLatestEntriesResponse {
  [label: string]: {
    status: 'OK' | 'FAILURE';
    error?: string;
    existingEntries?: TimeEntryResponse[];
    newEntries?: TimeEntryResponse[];
    deletedEntries?: DynamoEntryRow[];
  };
}

const parseEntries = async ({
  sourceEntries,
  targetEntries,
}: Record<'sourceEntries' | 'targetEntries', TimeEntryResponse[]>) => {
  const iteratee = ({ start, duration }: TimeEntryResponse) =>
    `${start}${duration}`;

  const existingEntries = sourceEntries.intersectBy(targetEntries, iteratee);
  const newEntries = sourceEntries.differenceBy(existingEntries, iteratee);
  const deletedEntries = targetEntries.differenceBy(existingEntries, iteratee);

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

            const [
              sourceDynamoEntries,
              targetDynamoEntries,
            ] = await Promise.all(
              [sourceEntries, targetEntries].map(async (entries) =>
                batchGetDynamoItems<DynamoEntryRow>({
                  tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
                  keyName: 'guid',
                  valuesToFind: entries.map((e) => e.guid),
                }),
              ),
            );

            const dynamoIteratee = (val: { guid: string }) => val.guid;

            const createdEntries = sourceEntries.differenceBy(
              sourceDynamoEntries,
              dynamoIteratee,
            );

            const existingEntries = sourceEntries.intersectBy(
              sourceDynamoEntries,
              dynamoIteratee,
            );

            const modifiedEntries = existingEntries.filter(
              (te) =>
                sourceDynamoEntries.find((de) => de.guid === te.guid)!
                  .lastUpdated < te.at,
            );

            const deletedEntries = sourceDynamoEntries.differenceBy(
              sourceEntries,
              dynamoIteratee,
            );

            return {
              [label]: {
                status: 'OK',
                newEntries: createdEntries,
                modifiedEntries,
                deletedEntries,
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

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

interface ParseEntriesInput {
  sourceTogglEntries: TimeEntryResponse[];
  targetTogglEntries: TimeEntryResponse[];
  sourceDynamoEntries: DynamoEntryRow[];
  targetDynamoEntries: DynamoEntryRow[];
}

const parseEntries = async (params: ParseEntriesInput) => {
  const {
    sourceTogglEntries,
    targetTogglEntries,
    sourceDynamoEntries,
    targetDynamoEntries,
  } = params;

  const dynamoIteratee = (val: { guid: string }) => val.guid;

  const togglIteratee = (val: Pick<TimeEntryResponse, 'duration' | 'start'>) =>
    `${val.duration}${val.start}`;

  // Time entries that exist in Toggl but are not processed
  // i.e. exist in Toggl but not in Dynamo
  const unprocessedEntries = sourceTogglEntries.differenceBy(
    sourceDynamoEntries,
    dynamoIteratee,
  );

  // Time entries that were created, i.e.
  // Do not have a match in target Toggl
  const newEntries = unprocessedEntries.differenceBy(
    targetTogglEntries,
    togglIteratee,
  );

  // Time entries that exist in Toggl and are already processed
  // Either skip or modify these entries
  const existingEntries = sourceTogglEntries.intersectBy(
    sourceDynamoEntries,
    dynamoIteratee,
  );

  // If the entry in Toggl was updated after last sync,
  // mark the entry to be modified
  const modifiedEntries = existingEntries.filter(
    (te) =>
      sourceDynamoEntries.find((de) => de.guid === te.guid)!.lastUpdated <
      te.at,
  );

  // Fetch mapped DynamoDB entries for the Toggl entries that were
  // found from target account.
  const previousSourceDynamoEntries = await batchGetDynamoItems<DynamoEntryRow>(
    {
      tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
      keyName: 'guid',
      valuesToFind: targetDynamoEntries.map((e) => e.mappedTo),
    },
  );

  // If the entry is removed from source account, this means
  // that these entries should not be found from current source Toggl entries.
  const deletedEntries = previousSourceDynamoEntries.differenceBy(
    sourceTogglEntries,
    dynamoIteratee,
  );

  return {
    entriesToCreateRaw: newEntries,
    entriesToDeleteRaw: deletedEntries,
    entriesToModifyRaw: modifiedEntries,
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
            // Get decoded SSM parameters for source and target
            // i.e. api token for Toggl
            const ssmValues = await getSSMParameters(
              sourceApiKeySSMRef,
              targetApiKeySSMRef,
            );

            // Get Toggl time entries from last three days for both
            // source and target account
            const [sourceTogglEntries, targetTogglEntries] = await Promise.all(
              [sourceApiKeySSMRef, targetApiKeySSMRef].map(async (ssmName) =>
                (
                  await fetchLatestTogglEntries({
                    apiToken: ssmValues[ssmName],
                    days: 3,
                  })
                ).filter((entry) => entry.duration > 0),
              ),
            );

            // Get matching DynamoDB entries for entries received from Toggl
            // i.e. DynamoDB row guid matches Toggl time entry guid
            const [
              sourceDynamoEntries,
              targetDynamoEntries,
            ] = await Promise.all(
              [sourceTogglEntries, targetTogglEntries].map(async (entries) =>
                batchGetDynamoItems<DynamoEntryRow>({
                  tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
                  keyName: 'guid',
                  valuesToFind: entries.map((e) => e.guid),
                }),
              ),
            );

            // Raw parsed values
            // i.e. no mapping applied
            const {
              entriesToCreateRaw,
              entriesToDeleteRaw,
              entriesToModifyRaw,
            } = await parseEntries({
              sourceTogglEntries,
              targetTogglEntries,
              sourceDynamoEntries,
              targetDynamoEntries,
            });

            // Fetch mapping

            return {
              [label]: {
                status: 'OK',
                newEntries: entriesToCreateRaw,
                modifiedEntries: entriesToModifyRaw,
                deletedEntries: entriesToDeleteRaw,
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

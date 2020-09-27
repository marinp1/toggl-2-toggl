import {
  successResponse,
  errorResponse,
  getSSMParameters,
  fetchLatestTogglEntries,
  queryDynamoTableGSI,
  batchGetDynamoItems,
  mapEntryForRequest,
} from 'service';

import {
  LambdaEvent,
  LambdaResponse,
  DynamoTaskRow,
  DynamoEntryRow,
  DynamoMapRow,
} from 'service/types';

import { TimeEntryResponse, TimeEntryRequest } from 'toggl-api/types';

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

Array.prototype.uniq = function() {
  return [...new Set(this)];
};

Array.prototype.uniqBy = function(iteratee) {
  return this.filter(
    (val, ind, self) =>
      self.findIndex((val2) => iteratee(val2) === iteratee(val)) === ind,
  );
};

interface FailureResponse {
  [label: string]: {
    status: 'FAILURE';
    error: string;
  };
}

interface SuccessResponse {
  [label: string]: {
    status: 'OK';
    output: {
      modifiedEntries: Record<string, TimeEntryRequest>;
      newEntries: TimeEntryRequest[];
      deletedEntries: string[];
    };
    debug: {
      entryMappings: any;
      modifiedEntries: TimeEntryResponse[];
      createdEntries: TimeEntryResponse[];
      deletedEntries: DynamoEntryRow[];
    };
  };
}

type FetchLatestEntriesResponse = FailureResponse | SuccessResponse;

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

  const dynamoIteratee = (val: { id: string | number }) => String(val.id);

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
      sourceDynamoEntries.find((de) => String(de.id) === String(te.id))!
        .lastUpdated < te.at,
  );

  // Fetch mapped DynamoDB entries for the Toggl entries that were
  // found from target account.
  const previousSourceDynamoEntries = await batchGetDynamoItems<DynamoEntryRow>(
    {
      tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
      hashKeyName: 'id',
      valuesToFind: targetDynamoEntries.map((e) => ({ hashKey: e.mappedTo })),
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
            // i.e. DynamoDB row id matches Toggl time entry id
            const [
              sourceDynamoEntries,
              targetDynamoEntries,
            ] = await Promise.all(
              [sourceTogglEntries, targetTogglEntries].map(async (entries) =>
                batchGetDynamoItems<DynamoEntryRow>({
                  tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
                  hashKeyName: 'id',
                  valuesToFind: entries.map((e) => ({ hashKey: String(e.id) })),
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

            // Workspace IDs for all required entries
            const spaceIds = [...entriesToCreateRaw, ...entriesToModifyRaw]
              .flatMap((a) => [
                {
                  wid: String(a.wid),
                  pid: a.pid ? String(a.pid) : '*',
                },
                {
                  wid: String(a.wid),
                  pid: '*',
                },
              ])
              .uniqBy(({ wid, pid }) => `${wid}${pid}`);

            // Entry mappings for workspace IDs
            const entryMappings = await batchGetDynamoItems<DynamoMapRow>({
              tableName: process.env.DYNAMO_MAPPING_TABLE_NAME,
              hashKeyName: 'sourceWid',
              rangeKeyName: 'sourcePid',
              valuesToFind: spaceIds.map(({ wid, pid }) => ({
                hashKey: wid,
                rangeKey: pid,
              })),
            });

            const entriesToCreate = entriesToCreateRaw
              .map((e) => mapEntryForRequest(e, entryMappings))
              .filter((e) => e !== null) as TimeEntryRequest[];

            const entriesToModify = entriesToModifyRaw.reduce<
              Record<string, TimeEntryRequest>
            >(
              (acc, e) => ({
                ...acc,
                [e.id]: mapEntryForRequest(e, entryMappings),
              }),
              {},
            );

            const entriesToDelete = entriesToDeleteRaw.map((e) => e.id);

            // Send requests to Toggl
            // Write dynamoDB rows

            return {
              [label]: {
                status: 'OK',
                output: {
                  newEntries: entriesToCreate,
                  modifiedEntries: entriesToModify,
                  deletedEntries: entriesToDelete,
                },
                debug: {
                  entryMappings,
                  createdEntries: entriesToCreateRaw,
                  modifiedEntries: entriesToModifyRaw,
                  deletedEntries: entriesToDeleteRaw,
                },
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
  } catch (err) {
    return errorResponse(err);
  }
};

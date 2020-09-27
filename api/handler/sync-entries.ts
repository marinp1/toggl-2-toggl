import {
  getSSMParameters,
  queryDynamoTableGSI,
  batchGetDynamoItems,
  batchWriteDynamoItems,
} from 'service/aws-helpers';

import {
  fetchLatestTogglEntries,
  mapEntryForRequest,
  parseEntries,
  deleteEntries,
  modifyEntries,
  createEntries,
} from 'service/toggl-helpers';

import { successResponse, errorResponse } from 'service/lambda-helpers';

import {
  useDifferenceBy,
  useIntersectBy,
  useUniqBy,
} from 'service/array-helpers';

import {
  LambdaEvent,
  LambdaResponse,
  DynamoTaskRow,
  DynamoEntryRow,
  DynamoMapRow,
  EnrichedTimeEntryResponse,
  EnrichedWithMap,
} from 'service/types';

import { TimeEntryResponse, TimeEntryRequest } from 'toggl-api/types';

interface FailureResponse {
  [label: string]: {
    status: 'FAILURE';
    error: string;
  };
}

interface SuccessResponse {
  [label: string]: {
    status: 'OK';
    input: {
      entriesToModify: Record<string, TimeEntryRequest | null>;
      entriesToCreate: Record<string, TimeEntryRequest | null>;
      entriesToDelete: string[];
    };
    output: any;
    debug: {
      entryMappings: any;
      modifiedEntries: EnrichedTimeEntryResponse[];
      createdEntries: EnrichedTimeEntryResponse[];
      deletedEntries: DynamoEntryRow[];
    };
  };
}

type FetchLatestEntriesResponse = FailureResponse | SuccessResponse;

export const syncEntries = async (
  event: LambdaEvent,
): LambdaResponse<FetchLatestEntriesResponse> => {
  useDifferenceBy();
  useIntersectBy();
  useUniqBy();

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
            const sourceDynamoEntriesPromise = batchGetDynamoItems<
              DynamoEntryRow
            >({
              tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
              hashKeyName: 'id',
              valuesToFind: sourceTogglEntries.map((e) => ({
                hashKey: String(e.id),
              })),
            });

            // FIXME: Inefficient query
            const targetDynamoEntriesPromise = Promise.all(
              targetTogglEntries.map(async (te) =>
                queryDynamoTableGSI<DynamoEntryRow>({
                  tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
                  gsiName: 'mappedTo',
                  valueToFind: String(te.id),
                }),
              ),
            ).then((res) => res.flat());

            const [
              sourceDynamoEntries,
              targetDynamoEntries,
            ] = await Promise.all([
              sourceDynamoEntriesPromise,
              targetDynamoEntriesPromise,
            ]);

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

            const entriesToCreate = entriesToCreateRaw.reduce<
              Record<string, TimeEntryRequest | null>
            >(
              (acc, e) => ({
                ...acc,
                [e.id]: mapEntryForRequest(e, entryMappings).entry,
              }),
              {},
            );

            const entriesToModify = entriesToModifyRaw.reduce<
              Record<string, EnrichedWithMap<TimeEntryRequest> | null>
            >(
              (acc, e) => ({
                ...acc,
                [e.id]: (() => {
                  const mapping = mapEntryForRequest(e, entryMappings);
                  return {
                    ...mapping.entry,
                    __mappedTo: String(mapping.__original.__mappedTo),
                  };
                })(),
              }),
              {},
            );

            const entriesToDelete = entriesToDeleteRaw.map((e) => e.mappedTo);

            // Send results to target API
            const targetApiToken = ssmValues[targetApiKeySSMRef];

            // 1. Delete entries
            const deleteResults = await deleteEntries({
              apiToken: targetApiToken,
              entryIds: entriesToDelete,
            });

            // 2. Modify entries
            const modifyResults = await modifyEntries({
              apiToken: targetApiToken,
              requests: entriesToModify,
            });

            // 3. Create entries
            const createResults = await createEntries({
              apiToken: targetApiToken,
              requests: entriesToCreate,
            });

            // Items to delete from DynamoDB
            const dynamoItemsToDelete = deleteResults.successes.map((drs) => ({
              hashKey: drs,
            }));

            // Items to add to DynamoDB
            const dynamoItemsToCreate: DynamoEntryRow[] = Object.entries(
              createResults.successes,
            ).map(([key, entry]) => ({
              id: key,
              lastUpdated: entry.at,
              mappedTo: String(entry.id),
            }));

            // Items to modify in DynamoDB (overwrite)
            const dynamoItemsToModify: DynamoEntryRow[] = Object.entries(
              modifyResults.successes,
            ).map(([key, entry]) => ({
              id: key,
              lastUpdated: entry.at,
              mappedTo: String(entry.id),
            }));

            // Write dynamoDB rows
            const batchWriteResult = await batchWriteDynamoItems<
              DynamoEntryRow
            >({
              tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
              hashKeyName: 'id',
              itemsToDelete: dynamoItemsToDelete,
              itemsToPut: [...dynamoItemsToCreate, ...dynamoItemsToModify],
            });

            console.debug(
              JSON.stringify({
                batchWriteResult,
              }),
            );

            return {
              [label]: {
                status: 'OK',
                input: {
                  entriesToCreate,
                  entriesToModify,
                  entriesToDelete,
                },
                output: {
                  deleteResults,
                  modifyResults,
                  createResults,
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

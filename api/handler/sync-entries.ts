import {
  getSSMParameters,
  queryDynamoTableGSI,
  batchGetDynamoItems,
} from 'service/aws-helpers';

import {
  fetchLatestTogglEntries,
  mapEntryForRequest,
  parseEntries,
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
    output: {
      entriesToModify: Record<string, TimeEntryRequest>;
      entriesToCreate: TimeEntryRequest[];
      entriesToDelete: string[];
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
                  entriesToCreate,
                  entriesToModify,
                  entriesToDelete,
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

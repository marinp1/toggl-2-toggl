import { getSSMParameters, queryDynamoTableGSI } from 'service/aws-helpers';
import { successResponse, errorResponse } from 'service/lambda-helpers';

import {
  useDifferenceBy,
  useIntersectBy,
  useUniqBy,
  useChunk,
} from 'service/array-helpers';

import {
  LambdaEvent,
  LambdaResponse,
  DynamoTaskRow,
  DynamoEntryRow,
  EnrichedWithMap,
} from 'service/types';

import { TimeEntryResponse, TimeEntryRequest } from 'toggl-api/types';

// Use default import since all of these procedures are needed
// (increased compressed bundle size by 4 bytes)
import * as procedures from 'service/procedures';

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
      entriesToDelete: Record<string, string>;
    };
    output: any;
    debug: {
      entryMappings: any;
      modifiedEntries: EnrichedWithMap<TimeEntryResponse>[];
      createdEntries: TimeEntryResponse[];
      deletedEntries: DynamoEntryRow[];
    };
  };
}

type FetchLatestEntriesResponse = FailureResponse | SuccessResponse;

export const syncEntries = async (
  event: LambdaEvent,
): LambdaResponse<FetchLatestEntriesResponse> => {
  // Use there array features
  useDifferenceBy();
  useIntersectBy();
  useUniqBy();
  useChunk();

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
            const [
              sourceTogglEntries,
              targetTogglEntries,
            ] = await procedures.getLatestTogglEntries({
              sourceApiKeyName: sourceApiKeySSMRef,
              targetApiKeyName: targetApiKeySSMRef,
              fetchedParameters: ssmValues,
            });

            // Get entries from Dynamo for both account for comparison
            const [
              sourceDynamoEntries,
              targetDynamoEntries,
            ] = await procedures.getDynamoEntries({
              sourceTogglEntries,
              targetTogglEntries,
            });

            // Raw parsed values
            // i.e. no mapping applied
            const {
              entriesToCreateRaw,
              entriesToDeleteRaw,
              entriesToModifyRaw,
            } = await procedures.parseEntries({
              sourceTogglEntries,
              targetTogglEntries,
              sourceDynamoEntries,
              targetDynamoEntries,
            });

            // Entry mappings for workspace IDs
            const entryMappings = await procedures.getEntryMappings([
              ...entriesToCreateRaw,
              ...entriesToModifyRaw,
            ]);

            // Map raw values to requests and override
            // required attributes
            const {
              entriesToDelete,
              entriesToModify,
              entriesToCreate,
            } = procedures.mapRawEntriesToRequests({
              entriesToCreateRaw,
              entriesToDeleteRaw,
              entriesToModifyRaw,
              entryMappings,
            });

            // Send results to target API
            const {
              deleteResults,
              createResults,
              modifyResults,
            } = await procedures.writeEntriesToToggl({
              apiToken: ssmValues[targetApiKeySSMRef],
              entriesToCreate,
              entriesToDelete,
              entriesToModify,
            });

            // Update dynamo entries in database
            await procedures.updateDynamoEntries({
              deleteResults,
              createResults,
              modifyResults,
            });

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

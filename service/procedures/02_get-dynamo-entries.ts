import { batchGetDynamoItems, queryDynamoTableGSI } from '../aws-helpers';
import { DynamoEntryRow } from '../types';
import { TimeEntryResponse } from 'toggl-api/types';

export const getDynamoEntries = ({
  sourceTogglEntries,
  targetTogglEntries,
}: Record<
  'sourceTogglEntries' | 'targetTogglEntries',
  TimeEntryResponse[]
>) => {
  // Get matching DynamoDB entries for entries received from Toggl
  // i.e. DynamoDB row id matches Toggl time entry id
  const sourceDynamoEntriesPromise = batchGetDynamoItems<DynamoEntryRow>({
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

  return Promise.all([sourceDynamoEntriesPromise, targetDynamoEntriesPromise]);
};

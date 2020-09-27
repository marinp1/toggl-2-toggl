import { TimeEntryResponse } from 'toggl-api/types';
import { DynamoEntryRow } from '../types';
import { batchGetDynamoItems } from '../aws-helpers';

interface ParseEntriesInput {
  sourceTogglEntries: TimeEntryResponse[];
  targetTogglEntries: TimeEntryResponse[];
  sourceDynamoEntries: DynamoEntryRow[];
  targetDynamoEntries: DynamoEntryRow[];
}

export const parseEntries = async (params: ParseEntriesInput) => {
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

import { TimeEntryResponse } from 'toggl-api/types';
import { DynamoEntryRow } from '../types';

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
  const modifiedEntries = existingEntries
    .filter((te) => {
      const mappedEntry = sourceDynamoEntries.find(
        (de) => String(de.id) === String(te.id),
      );
      return mappedEntry && mappedEntry.lastUpdated < te.at;
    })
    // Enrich result with mappedTo value from database
    .map((te) => {
      const mappedEntry = sourceDynamoEntries.find(
        (de) => String(de.id) === String(te.id),
      );
      return {
        ...te,
        __mappedTo: mappedEntry ? mappedEntry.mappedTo : 'not-set',
      };
    });

  // If the entry is removed from source account, this means
  // that these entries should not be found from current source Toggl entries.
  const deletedEntries = targetDynamoEntries.differenceBy(
    sourceTogglEntries,
    dynamoIteratee,
  );

  return {
    entriesToCreateRaw: newEntries,
    entriesToDeleteRaw: deletedEntries,
    entriesToModifyRaw: modifiedEntries,
  };
};

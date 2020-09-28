import { batchWriteDynamoItems } from '../aws-helpers';

import { DynamoEntryRow } from '../types';

type Params = {
  deleteResults: Await<
    ReturnType<typeof import('../toggl-helpers/delete-entries').deleteEntries>
  >;
  modifyResults: Await<
    ReturnType<typeof import('../toggl-helpers/modify-entries').modifyEntries>
  >;
  createResults: Await<
    ReturnType<typeof import('../toggl-helpers/create-entries').createEntries>
  >;
};

export const updateDynamoEntries = ({
  deleteResults,
  createResults,
  modifyResults,
}: Params) => {
  // Items to delete from DynamoDB
  const dynamoItemsToDelete = deleteResults.successes.map((drs) => ({
    hashKey: drs,
  }));

  // Items to add or overwrite in DynamoDB
  const dynamoItemsToWrite = Object.entries(createResults.successes)
    .concat(Object.entries(modifyResults.successes))
    .map(([key, entry]) => ({
      id: key,
      lastUpdated: entry.at,
      mappedTo: String(entry.id),
    }));

  // Write dynamoDB rows
  return batchWriteDynamoItems<DynamoEntryRow>({
    tableName: process.env.DYNAMO_ENTRIES_TABLE_NAME,
    hashKeyName: 'id',
    itemsToDelete: dynamoItemsToDelete,
    itemsToPut: dynamoItemsToWrite,
  });
};

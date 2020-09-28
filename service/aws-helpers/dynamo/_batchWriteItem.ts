import {
  BatchWriteItemInput,
  DeleteRequest,
  PutRequest,
  WriteRequest,
  BatchWriteItemRequestMap,
} from 'aws-sdk/clients/dynamodb';

import { getDynamoClient } from './getDynamoClient';

import { valueToAttributeValue } from './dynamoValueMappers';

import { DynamoError } from '../../errors';

import { DynamoMapValue, DynamoSingleValue } from '../../types';

interface DynamoWriteItemParams<T extends DynamoMapValue> {
  tableName: string | undefined;
  hashKeyName: keyof T;
  rangeKeyName?: keyof T;
  itemsToDelete: {
    hashKey: DynamoSingleValue;
    rangeKey?: DynamoSingleValue;
  }[];
  itemsToPut: T[];
}

export const batchWriteDynamoItems = async <ResponseItemType>(
  params: DynamoWriteItemParams<ResponseItemType>,
): Promise<BatchWriteItemRequestMap[]> => {
  const {
    tableName,
    itemsToDelete,
    itemsToPut,
    hashKeyName,
    rangeKeyName,
  } = params;
  const client = getDynamoClient();

  if (!tableName) {
    throw new Error('Table name is required for batchWriteItems');
  }

  const deleteRequests: WriteRequest[] = itemsToDelete.map(
    ({ hashKey, rangeKey }) => {
      const deleteRequest: DeleteRequest = { Key: {} };
      deleteRequest.Key[hashKeyName as string] = valueToAttributeValue(hashKey);
      if (rangeKeyName && rangeKey)
        deleteRequest.Key[rangeKeyName as string] = valueToAttributeValue(
          rangeKey,
        );
      return { DeleteRequest: deleteRequest };
    },
  );

  const putRequests: WriteRequest[] = itemsToPut.map((item) => {
    const putRequest: PutRequest = { Item: {} };
    Object.entries(item).forEach(
      ([key, value]) => (putRequest.Item[key] = valueToAttributeValue(value)),
    );
    return { PutRequest: putRequest };
  });

  // Split into max 100 items per requests
  const chunkedRequests = [...deleteRequests, ...putRequests].chunk(25);

  const unprocessedItems = (
    await Promise.all(
      chunkedRequests.map(async (requestChunk) => {
        const batchWriteItemInput: BatchWriteItemInput = {
          RequestItems: {
            [tableName]: requestChunk,
          },
        };

        try {
          const response = await client
            .batchWriteItem(batchWriteItemInput)
            .promise();

          return response.UnprocessedItems || {};
        } catch (err) {
          console.debug(batchWriteItemInput);
          console.debug(err);
          throw new DynamoError(
            `Failed to batch write items to ${tableName}`,
            -1,
          );
        }
      }),
    )
  ).flat();

  return unprocessedItems;
};

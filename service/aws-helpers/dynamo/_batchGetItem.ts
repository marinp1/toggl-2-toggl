import chunk from 'lodash.chunk';
import { BatchGetItemInput, Key } from 'aws-sdk/clients/dynamodb';
import { getDynamoClient } from './getDynamoClient';

import { valueToAttributeValue, parseDynamoItem } from './dynamoValueMappers';

import { DynamoMapValue, DynamoSingleValue } from '../../types';

interface DynamoGetItemParams<T extends DynamoMapValue> {
  tableName: string | undefined;
  hashKeyName: keyof T;
  rangeKeyName?: keyof T;
  valuesToFind: { hashKey: DynamoSingleValue; rangeKey?: DynamoSingleValue }[];
}

export const batchGetDynamoItems = async <ResponseItemType>(
  params: DynamoGetItemParams<ResponseItemType>,
): Promise<ResponseItemType[]> => {
  const { tableName, hashKeyName, rangeKeyName, valuesToFind } = params;
  const client = getDynamoClient();

  if (!tableName) {
    throw new Error('Table name is required for batchGetItems');
  }

  // Split into max 100 items per requests
  const chunkedValues = chunk(valuesToFind, 100);

  const items = (
    await Promise.all(
      chunkedValues.map(async (valueChunk) => {
        const batchGetItemInput: BatchGetItemInput = {
          RequestItems: {
            [tableName]: {
              ConsistentRead: true,
              Keys: valueChunk.map(({ hashKey, rangeKey }) => {
                const keyValue: Key = {};
                keyValue[hashKeyName as string] = valueToAttributeValue(
                  hashKey,
                );
                if (rangeKeyName && rangeKey)
                  keyValue[rangeKeyName as string] = valueToAttributeValue(
                    rangeKey,
                  );
                return keyValue;
              }),
            },
          },
        };

        try {
          const data = await client.batchGetItem(batchGetItemInput).promise();
          if (!data.Responses || !data.Responses[tableName]) {
            return [];
          }
          return data.Responses[tableName].map(
            parseDynamoItem,
          ) as ResponseItemType[];
        } catch (err) {
          console.debug(batchGetItemInput);
          console.debug(err);
          throw new Error(
            `Failed to batch get items from ${tableName} with hash key ${hashKeyName} and range key ${rangeKeyName ||
              '[none]'} with values ${Object.keys(valueChunk).join(', ')}`,
          );
        }
      }),
    )
  ).flat();

  return items;
};

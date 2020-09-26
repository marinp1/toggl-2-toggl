import { chunk } from 'lodash-es';
import { BatchGetItemInput } from 'aws-sdk/clients/dynamodb';
import { getDynamoClient } from './getDynamoClient';

import { valueToAttributeValue, parseDynamoItem } from './dynamoValueMappers';

import { DynamoMapValue, DynamoSingleValue } from '../../types';

interface DynamoGetItemParams<T extends DynamoMapValue> {
  tableName: string | undefined;
  keyName: keyof T;
  valuesToFind: DynamoSingleValue[];
}

export const batchGetDynamoItems = async <ResponseItemType>(
  params: DynamoGetItemParams<ResponseItemType>,
): Promise<ResponseItemType[]> => {
  const { tableName, keyName, valuesToFind } = params;
  const client = getDynamoClient();

  if (!tableName) {
    throw new Error('Table name is required for query');
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
              Keys: valueChunk
                .map(valueToAttributeValue)
                .map((val) => ({ [keyName]: val })),
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
            `Failed to batch get items from ${tableName} with key ${keyName} with values ${valueChunk.join(
              ', ',
            )}`,
          );
        }
      }),
    )
  ).flat();

  return items;
};

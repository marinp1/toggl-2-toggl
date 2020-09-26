import { QueryInput } from 'aws-sdk/clients/dynamodb';
import { getDynamoClient } from './getDynamoClient';

import { valueToAttributeValue, parseDynamoItem } from './dynamoValueMappers';

import { DynamoSingleValue, DynamoMapValue } from '../types';

interface GSIQueryParams<T> {
  tableName: string | undefined;
  gsiName: T;
  valueToFind: DynamoSingleValue;
}

export const queryDynamoTableGSI = async <
  ResponseItemType extends DynamoMapValue = {}
>(
  params: GSIQueryParams<keyof ResponseItemType>,
): Promise<ResponseItemType[]> => {
  const { tableName, gsiName, valueToFind } = params;
  const client = getDynamoClient();

  if (!tableName) {
    throw new Error('Table name is required for query');
  }

  const queryInput: QueryInput = {
    TableName: tableName,
    IndexName: `${gsiName}-index`, // all indexes are named {{name}}-index
    KeyConditionExpression: `${gsiName} = :ind_val`,
    ExpressionAttributeValues: {
      ':ind_val': valueToAttributeValue(valueToFind),
    },
    ScanIndexForward: false,
  };

  try {
    const data = await client.query(queryInput).promise();
    return (data.Items || []).map(parseDynamoItem) as ResponseItemType[];
  } catch (err) {
    console.debug(JSON.stringify(queryInput));
    console.debug(err);
    throw new Error(
      `Failed to query ${tableName} index ${gsiName} with ${String(
        valueToFind,
      )}`,
    );
  }
};

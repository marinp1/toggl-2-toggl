import { AttributeValue, AttributeMap } from 'aws-sdk/clients/dynamodb';
import { DynamoSingleValue, DynamoValueType } from '../../types';

export const valueToAttributeValue = (
  val: DynamoSingleValue,
): AttributeValue => {
  if (val === null) return { NULL: true };
  switch (typeof val) {
    case 'boolean':
      return { BOOL: val };
    case 'string':
      return { S: val };
    case 'number':
      return { N: String(val) };
    default:
      throw new Error(
        `Unknown type of ${String(
          val,
        )} (${typeof val}), should be string, number or boolean`,
      );
  }
};

const attributeValueToValue = (
  attributeValue: AttributeValue,
): DynamoValueType => {
  const { BOOL, N, S, L, M, NULL } = attributeValue;

  if (BOOL) return !!BOOL;
  if (N) return Number(N);
  if (S) return String(S);
  if (NULL) return null;

  if (L) return L.map(attributeValueToValue);

  if (M)
    return Object.entries(M).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: attributeValueToValue(value),
      }),
      {},
    );

  throw new Error(`Failed to map ${JSON.stringify(attributeValue)}`);
};

export const parseDynamoItem = <T extends AttributeMap>(val: T) =>
  attributeValueToValue({ M: val });

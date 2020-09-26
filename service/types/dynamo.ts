export type DynamoSingleValue = string | number | boolean | null;

export interface DynamoMapValue {
  [x: string]: DynamoSingleValue | DynamoMapValue | DynamoArrayValue;
}

export interface DynamoArrayValue
  extends Array<DynamoArrayValue | DynamoSingleValue | DynamoMapValue> {}

export type DynamoValueType =
  | DynamoSingleValue
  | DynamoMapValue
  | DynamoArrayValue;

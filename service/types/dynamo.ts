export type DynamoSingleValue = string | number | boolean | null;

export type DynamoMapValue<T extends Record<string, any> = {}> = {
  readonly [x in keyof T]: T[x] extends object
    ? DynamoMapValue<T[x]>
    : T[x] extends any[]
    ? DynamoArrayValue<T[x]>
    : T[x];
};

export interface DynamoArrayValue<T>
  extends Array<DynamoArrayValue<T> | DynamoSingleValue | DynamoMapValue<T>> {}

export type DynamoValueType<T extends object = {}> =
  | DynamoSingleValue
  | DynamoMapValue<T>
  | DynamoArrayValue<T>;

import { DynamoMapValue } from './dynamo';

export type DynamoMapRow = DynamoMapValue<{
  label: string;
  sourceWid: string; // * for wildcard;
  sourcePid: string; // * for wildcard;
  targetWid: string;
  targetPid: string | null;
  overrides: {
    billable: boolean | null;
    tags: string[] | null;
    description: string | null;
  } | null;
}>;

export type DynamoEntryRow = DynamoMapValue<{
  type: 'source-entry' | 'target-entry';
  id: string; // id
  lastUpdated: string;
  mappedTo: string; // id
}>;

export type DynamoTaskRow = DynamoMapValue<{
  label: string;
  sourceApiKeySSMRef: string;
  targetApiKeySSMRef: string;
  active: number; // 1 active, 0 inactive
}>;

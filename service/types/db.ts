import { DynamoMapValue } from './dynamo';

export type DynamoMapRow = DynamoMapValue<{
  label: string;
  sourceWid: string; // * for wildcard;
  sourcePid: string; // * for wildcard;
  targetWid: string;
  targetPid: string | null;
  overrides: {
    billable: boolean | null;
    labels: string[] | null;
    description: string | null;
  } | null;
}>;

export type DynamoEntryRow = DynamoMapValue<{
  type: 'source-entry' | 'target-entry';
  guid: string; // guid
  lastUpdated: string;
  mappedTo: string | null; // guid
}>;

export type DynamoTaskRow = DynamoMapValue<{
  label: string;
  sourceApiKeySSMRef: string;
  targetApiKeySSMRef: string;
  active: number; // 1 active, 0 inactive
}>;

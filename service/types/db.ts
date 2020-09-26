import { DynamoMapValue } from './dynamo';

export interface DynamoMapRow extends DynamoMapValue {
  label: string;
  sourceWid: string; // * for wildcard;
  sourcePid: string; // * for wildcard;
  targetWid: string;
  targetPid: string | null;
  overrides: {
    billable: boolean | null;
    labels: string[];
    description: string | null;
  } | null;
}

export interface DynamoEntryRow extends DynamoMapValue {
  type: 'source-entry' | 'target-entry';
  guid: string; // guid
  lastUpdated: string;
  mappedTo: string | null; // guid
}

export interface DynamoTaskRow extends DynamoMapValue {
  label: string;
  sourceApiKeySSMRef: string;
  targetApiKeySSMRef: string;
  active: number; // 1 active, 0 inactive
}

type DynamoMapRow = {
  label: string;
  sourceWid: string; // * for wildcard;
  sourcePid: string; // * for wildcard;
  targetWid: string;
  targetPid: string | null;
  overrides: {
    billable?: boolean;
    labels?: string[];
    description?: string;
  } | null;
};

type DynamoEntryRow = {
  type: 'source-entry' | 'target-entry';
  tid: string; // tid
  lastUpdated: string;
  mappedTo: string | null; // tid
};

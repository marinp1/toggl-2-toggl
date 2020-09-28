import { ConfigurationError } from '../errors';

import {
  EnrichedTimeEntryResponse,
  TogglEntryRequest,
  DynamoMapRow,
} from '../types';

export const mapEntryForRequest = (
  entry: EnrichedTimeEntryResponse,
  entryMappings: DynamoMapRow[],
): TogglEntryRequest => {
  // Unique mapping row
  const projectMappingRow = entryMappings.find(
    (row) =>
      row.sourceWid === String(entry.wid) &&
      row.sourcePid === String(entry.pid),
  );

  // Wildcard mapping row
  const wildcardMappingRow = entryMappings.find(
    (row) => row.sourceWid === String(entry.wid) && row.sourcePid === '*',
  );

  const mappingRow = projectMappingRow || wildcardMappingRow;

  // If row was not found, return null
  if (!mappingRow) return { __original: entry, entry: null };

  if (!mappingRow.targetWid) {
    throw new ConfigurationError('Target workspace ID not given');
  }

  if (
    mappingRow.overrides &&
    mappingRow.overrides.tags &&
    !Array.isArray(mappingRow.overrides.tags)
  ) {
    throw new ConfigurationError('Tags should be an array');
  }

  return {
    entry: {
      created_with: 'toggl-sync-app',
      wid: Number(mappingRow.targetWid),
      pid: mappingRow.targetPid ? Number(mappingRow.targetPid) : undefined,
      billable:
        (mappingRow.overrides && mappingRow.overrides.billable) || false,
      tags: (mappingRow.overrides && mappingRow.overrides.tags) || [],
      description:
        (mappingRow.overrides && mappingRow.overrides.description) ||
        entry.description,
      start: entry.start,
      stop: entry.stop,
      duration: entry.duration,
    },
    __original: entry,
  };
};

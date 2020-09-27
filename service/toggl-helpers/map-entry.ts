import { TimeEntryResponse, TimeEntryRequest } from 'toggl-api/types';
import { DynamoMapRow } from '../types';
import { ConfigurationError } from '../errors';

export const mapEntryForRequest = (
  entry: TimeEntryResponse,
  entryMappings: DynamoMapRow[],
): TimeEntryRequest | null => {
  // Unique mapping row
  const mappingRow = entryMappings.find(
    (row) =>
      row.sourceWid === String(entry.wid) &&
      row.sourcePid === String(entry.pid || '*'),
  );

  // If row was not found, return null
  if (!mappingRow) return null;

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
    created_with: 'toggl-sync-app',
    wid: Number(mappingRow.targetWid),
    pid: mappingRow.targetPid ? Number(mappingRow.targetPid) : undefined,
    billable: (mappingRow.overrides && mappingRow.overrides.billable) || false,
    tags: (mappingRow.overrides && mappingRow.overrides.tags) || [],
    description:
      (mappingRow.overrides && mappingRow.overrides.description) ||
      entry.description,
    start: entry.start,
    stop: entry.stop,
    duration: entry.duration,
  };
};

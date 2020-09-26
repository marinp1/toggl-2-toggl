import { TimeEntryResponse, TimeEntryRequest } from 'toggl-api/types';
import { DynamoMapRow } from '../types';
import { ConfigurationError } from '../errors';

export const mapEntryForRequest = (
  entry: TimeEntryResponse,
  entryMappings: DynamoMapRow[],
): TimeEntryRequest | null => {
  const mappingRows = entryMappings.filter(
    (emp) => emp.sourceWid === String(entry.wid),
  );

  // If not found, return null
  if (mappingRows.length === 0) return null;

  // Unique mapping row
  const pidMap = mappingRows.find((row) => row.sourcePid === String(entry.pid));

  // Wildcard mapping row
  const wildcardMap = mappingRows.find((row) => row.sourcePid === '*');

  // If neither exist, skip entry
  if (!pidMap || !wildcardMap) return null;

  const mappingRow = pidMap || wildcardMap;

  if (!mappingRow.targetWid) {
    throw new ConfigurationError('Target workspace ID not given');
  }

  if (
    mappingRow.overrides &&
    mappingRow.overrides.tags &&
    Array.isArray(mappingRow.overrides.tags)
  ) {
    throw new ConfigurationError('Tags should be an array');
  }

  return {
    created_with: 'toggl-sync-app',
    wid: Number(mappingRow.targetWid),
    pid: Number(mappingRow.targetPid) || undefined,
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

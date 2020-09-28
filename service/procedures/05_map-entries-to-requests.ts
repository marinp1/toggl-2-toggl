import { TimeEntryResponse, TimeEntryRequest } from 'toggl-api/types';
import {
  EnrichedWithMap,
  DynamoMapRow,
  TogglEntryRequest,
  DynamoEntryRow,
} from '../types';

import { ConfigurationError } from '../errors';

const mapEntryForRequest = (
  entry: EnrichedWithMap<TimeEntryResponse> | TimeEntryResponse,
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

type Params = {
  entriesToCreateRaw: TimeEntryResponse[];
  entriesToModifyRaw: EnrichedWithMap<TimeEntryResponse>[];
  entriesToDeleteRaw: DynamoEntryRow[];
  entryMappings: DynamoMapRow[];
};

export const mapRawEntriesToRequests = ({
  entriesToCreateRaw,
  entriesToModifyRaw,
  entriesToDeleteRaw,
  entryMappings,
}: Params) => {
  const entriesToCreate = entriesToCreateRaw.reduce<
    Record<string, TimeEntryRequest | null>
  >(
    (acc, e) => ({
      ...acc,
      [e.id]: mapEntryForRequest(e, entryMappings).entry,
    }),
    {},
  );

  const entriesToModify = entriesToModifyRaw.reduce<
    Record<string, EnrichedWithMap<TimeEntryRequest> | null>
  >(
    (acc, e) => ({
      ...acc,
      [e.id]: (() => {
        const mapping = mapEntryForRequest(e, entryMappings);
        return {
          ...mapping.entry,
          __mappedTo: String(mapping.__original.__mappedTo),
        };
      })(),
    }),
    {},
  );

  const entriesToDelete = entriesToDeleteRaw.reduce<Record<string, string>>(
    (acc, e) => ({
      ...acc,
      [e.id]: e.mappedTo,
    }),
    {},
  );

  return {
    entriesToCreate,
    entriesToModify,
    entriesToDelete,
  };
};

import { prepareApi } from 'toggl-api/prepare-api';
import { updateEntry } from 'toggl-api/time-entries';

import { TimeEntryRequest, TimeEntryResponse } from 'toggl-api/types';
import { EnrichedWithMap } from '../types';

import { isFulfilled, isRejected } from '../utils';

export const modifyEntries = async (params: {
  apiToken: string;
  requests: {
    [mappedFrom: string]: EnrichedWithMap<TimeEntryRequest> | null;
  };
}): Promise<{
  successes: Record<string, TimeEntryResponse>;
  failures: string[];
}> => {
  const { apiToken, requests } = params;
  const preparedUpdateEntry = prepareApi(updateEntry, apiToken);

  const updatePromises = await Promise.allSettled(
    Object.entries(requests).map(([entryId, timeEntry]) =>
      timeEntry === null
        ? Promise.reject(`Skipped null entry ${entryId}`)
        : preparedUpdateEntry(entryId, timeEntry),
    ),
  );

  const successes = updatePromises.filter(isFulfilled).map((p) => p.value);
  const failures = updatePromises
    .filter(isRejected)
    .map((p) => String(p.reason));

  return {
    successes: successes.reduce((prev, cur) => ({ ...prev, ...cur }), {}),
    failures,
  };
};

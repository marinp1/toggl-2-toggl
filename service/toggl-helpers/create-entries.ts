import { prepareApi } from 'toggl-api/prepare-api';
import { createEntry } from 'toggl-api/time-entries';

import { isFulfilled, isRejected } from '../utils';

import { TimeEntryRequest, TimeEntryResponse } from 'toggl-api/types';

export const createEntries = async (params: {
  apiToken: string;
  requests: {
    [entryId: string]: TimeEntryRequest | null;
  };
}): Promise<{
  successes: Record<string, TimeEntryResponse>;
  failures: string[];
}> => {
  const { apiToken, requests } = params;
  const preparedCreateEntry = prepareApi(createEntry, apiToken);

  const createPromises = await Promise.allSettled(
    Object.entries(requests).map(([entryId, timeEntry]) =>
      timeEntry === null
        ? Promise.reject(`Skipped null entry ${entryId}`)
        : preparedCreateEntry(entryId, timeEntry),
    ),
  );

  const successes = createPromises.filter(isFulfilled).map((p) => p.value);
  const failures = createPromises
    .filter(isRejected)
    .map((p) => String(p.reason));

  return {
    successes: successes.reduce((prev, cur) => ({ ...prev, ...cur }), {}),
    failures,
  };
};

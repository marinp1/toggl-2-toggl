import { prepareApi, updateEntry } from 'toggl-api';
import { TimeEntryRequest, TimeEntryResponse } from 'toggl-api/types';
import { EnrichedWithMap } from '../types';

const isFulfilled = <T>(
  val: PromiseSettledResult<T>,
): val is PromiseFulfilledResult<T> => val.status === 'fulfilled';

const isRejected = <T>(
  val: PromiseSettledResult<T>,
): val is PromiseRejectedResult => val.status === 'rejected';

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

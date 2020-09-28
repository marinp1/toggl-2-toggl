import { prepareApi, deleteEntry } from 'toggl-api';

import { isFulfilled, isRejected } from '../utils';

export const deleteEntries = async (params: {
  apiToken: string;
  requests: Record<string, string>;
}): Promise<{
  successes: string[];
  failures: string[];
}> => {
  const { apiToken, requests } = params;
  const preparedDeleteEntry = prepareApi(deleteEntry, apiToken);

  const deletePromises = await Promise.allSettled(
    Object.entries(requests).map(([entryId, mappedEntryId]) =>
      preparedDeleteEntry(entryId, mappedEntryId),
    ),
  );

  const successes = deletePromises.filter(isFulfilled).map((p) => p.value);
  const failures = deletePromises
    .filter(isRejected)
    .map((p) => String(p.reason));

  return {
    successes,
    failures,
  };
};

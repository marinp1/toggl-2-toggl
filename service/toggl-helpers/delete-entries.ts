import { prepareApi, deleteEntry } from 'toggl-api';

const isFulfilled = <T>(
  val: PromiseSettledResult<T>,
): val is PromiseFulfilledResult<T> => val.status === 'fulfilled';

const isRejected = <T>(
  val: PromiseSettledResult<T>,
): val is PromiseRejectedResult => val.status === 'rejected';

export const deleteEntries = async (params: {
  apiToken: string;
  entryIds: string[];
}): Promise<{
  successes: string[];
  failures: string[];
}> => {
  const { apiToken, entryIds } = params;
  const preparedDeleteEntry = prepareApi(deleteEntry, apiToken);

  const deletePromises = await Promise.allSettled(
    entryIds.map((entryId) => preparedDeleteEntry(entryId)),
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

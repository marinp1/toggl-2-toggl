import { fetchLatestTogglEntries } from '../toggl-helpers';

type Params = {
  sourceApiKeyName: string;
  targetApiKeyName: string;
  fetchedParameters: Record<string, string>;
};

export const getLatestTogglEntries = async ({
  sourceApiKeyName,
  targetApiKeyName,
  fetchedParameters,
}: Params) => {
  return Promise.all(
    [sourceApiKeyName, targetApiKeyName].map(async (ssmName) =>
      (
        await fetchLatestTogglEntries({
          apiToken: fetchedParameters[ssmName],
          days: 3,
        })
      ).filter((entry) => entry.duration > 0),
    ),
  );
};

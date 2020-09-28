import { deleteEntries, modifyEntries, createEntries } from '../toggl-helpers';

type Params = {
  apiToken: string;
} & Await<
  ReturnType<
    typeof import('./05_map-entries-to-requests').mapRawEntriesToRequests
  >
>;

export const writeEntriesToToggl = async ({
  apiToken,
  entriesToCreate,
  entriesToDelete,
  entriesToModify,
}: Params) => {
  // 1. Delete entries
  const deleteResults = await deleteEntries({
    apiToken,
    requests: entriesToDelete,
  });

  // 2. Modify entries
  const modifyResults = await modifyEntries({
    apiToken,
    requests: entriesToModify,
  });

  // 3. Create entries
  const createResults = await createEntries({
    apiToken,
    requests: entriesToCreate,
  });

  return {
    deleteResults,
    modifyResults,
    createResults,
  };
};

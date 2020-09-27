import { TimeEntryResponse, TimeEntryRequest } from 'toggl-api/types';

export type EnrichedTimeEntryResponse = TimeEntryResponse &
  Partial<{ __mappedTo: string }>;

export type EnrichedWithMap<T> = T & { __mappedTo: string };

export type TogglEntryRequest = {
  entry: TimeEntryRequest | null;
  __original: EnrichedTimeEntryResponse;
};

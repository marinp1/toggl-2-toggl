import { TimeEntryRequest, TimeEntryResponse } from 'toggl-api/types';

export type EnrichedWithMap<T> = T & { __mappedTo: string };

export type TogglEntryRequest = {
  entry: TimeEntryRequest | null;
  __original: Partial<EnrichedWithMap<TimeEntryResponse>>;
};

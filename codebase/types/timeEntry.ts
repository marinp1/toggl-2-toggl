export interface IDynamoTimeEntry {
  entryIdFrom: string;
  secondsLogged: number;
  status: string;
  synced: number;
  creationDateTime: string;
  updateDateTime: string;
  isThesisEntry: number;
  description: string;
  startDateTime: string;
  stopDateTime: string;
  entryIdTo?: string;
  resolvedEntryName?: string;
}

// eslint-disable-next-line import/prefer-default-export
export const ENTRY_STATUSES = ['created', 'deleted', 'updated'] as const;

export interface ITimeEntry {
  entryIdFrom: string;
  secondsLogged: number;
  status: typeof ENTRY_STATUSES[number];
  synced: boolean;
  creationDateTime: Date;
  updateDateTime: Date;
  startDateTime: Date;
  endDateTime: Date;
  isThesisEntry: boolean;
  description: string;
  createdEntry: {
    id: string;
    name: string;
  } | null;
}

export interface ITogglEntry {
  id: string;
  isThesisEntry: boolean;
  secondsLogged: number;
  description: string;
  running: boolean;
  status: typeof ENTRY_STATUSES[number];
  updateDateTime: string;
  startDateTime: string;
  stopDateTime?: string;
}

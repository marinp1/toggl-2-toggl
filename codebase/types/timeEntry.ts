export interface IDynamoTimeEntry {
  entryIdFrom: string;
  secondsLogged: number;
  status: string;
  synced: boolean;
  creationDateTime: string;
  updateDateTime: string;
  isThesisEntry: boolean;
  description: string;
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
}

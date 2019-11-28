// Dynamo-easy requirement
import 'reflect-metadata';

import {
  GSIPartitionKey,
  GSISortKey,
  Model,
  PartitionKey,
} from '@shiftcoders/dynamo-easy';

import { TIME_ENTRY_INDEX } from '../indices';
import { IDynamoTimeEntry, ITimeEntry, ENTRY_STATUSES } from '@types';

@Model({ tableName: 'TimeEntries' })
export class TimeEntry implements IDynamoTimeEntry {
  @PartitionKey()
  public readonly entryIdFrom: string;

  @GSISortKey(TIME_ENTRY_INDEX.SECONDS_LOGGED)
  public readonly secondsLogged: number;

  @GSIPartitionKey(TIME_ENTRY_INDEX.STATUS)
  public readonly status: string;

  @GSIPartitionKey(TIME_ENTRY_INDEX.SYNCED)
  public readonly synced: number;

  @GSIPartitionKey(TIME_ENTRY_INDEX.IS_THESIS)
  public readonly isThesisEntry: number;

  @GSISortKey(TIME_ENTRY_INDEX.UPDATE_DATE_TIME)
  public readonly updateDateTime: string;

  @GSISortKey(TIME_ENTRY_INDEX.CREATION_DATE_TIME)
  public readonly creationDateTime: string;

  public readonly description: string;

  public readonly startDateTime: string;

  public readonly stopDateTime: string;

  public readonly entryIdTo?: string;

  public readonly resolvedEntryName?: string;
}

export const mapDbToTimeEntry = (
  dbTimeEntry: IDynamoTimeEntry,
): ITimeEntry => ({
  entryIdFrom: dbTimeEntry.entryIdFrom,
  secondsLogged: dbTimeEntry.secondsLogged,
  status: dbTimeEntry.status as typeof ENTRY_STATUSES[number],
  synced: dbTimeEntry.synced === 1,
  description: dbTimeEntry.description,
  creationDateTime: new Date(dbTimeEntry.creationDateTime),
  isThesisEntry: dbTimeEntry.isThesisEntry === 1,
  updateDateTime: new Date(dbTimeEntry.updateDateTime),
  startDateTime: new Date(dbTimeEntry.startDateTime),
  endDateTime: new Date(dbTimeEntry.stopDateTime),
  createdEntry: dbTimeEntry.entryIdTo
    ? {
        id: dbTimeEntry.entryIdTo,
        name: dbTimeEntry.resolvedEntryName || 'No description',
      }
    : null,
});

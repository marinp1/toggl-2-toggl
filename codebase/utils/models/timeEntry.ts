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
  public readonly synced: boolean;

  @GSISortKey(TIME_ENTRY_INDEX.UPDATE_DATE_TIME)
  public readonly updateDateTime: string;

  @GSISortKey(TIME_ENTRY_INDEX.CREATION_DATE_TIME)
  public readonly creationDateTime: string;

  public readonly entryIdTo: string;
  public readonly resolvedEntryName: string;
}

export const mapDbToTimeEntry = (
  dbTimeEntry: IDynamoTimeEntry,
): ITimeEntry => ({
  entryIdFrom: dbTimeEntry.entryIdFrom,
  secondsLogged: dbTimeEntry.secondsLogged,
  status: dbTimeEntry.status as typeof ENTRY_STATUSES[number],
  synced: dbTimeEntry.synced,
  creationDateTime: new Date(dbTimeEntry.creationDateTime),
  updateDateTime: new Date(dbTimeEntry.updateDateTime),
  createdEntry: dbTimeEntry.entryIdTo
    ? {
        id: dbTimeEntry.entryIdTo,
        name: dbTimeEntry.resolvedEntryName || 'No description',
      }
    : null,
});

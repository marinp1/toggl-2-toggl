import { DynamoStore } from '@shiftcoders/dynamo-easy';

import { TIME_ENTRY_INDEX } from '@utils/indices';
import { ITimeEntry, ENTRY_STATUSES } from '@types';
import { DatabaseError, DynamoDB, DB } from '@utils';

const getAllTimeEntries = async (): Promise<ITimeEntry[]> => {
  try {
    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    const entries = await timeEntryStore.scan().execFetchAll();
    return entries.map(DB.mapDbToTimeEntry);
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'getAllEntries', e);
  }
};

const getTimeEntry = async (id: string): Promise<ITimeEntry | null> => {
  try {
    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    const entry = await timeEntryStore.get(id).exec();
    return entry ? DB.mapDbToTimeEntry(entry) : null;
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'getEntry', e);
  }
};

const getUnsyncedTimeEntries = async (): Promise<ITimeEntry[]> => {
  try {
    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    const entries = await timeEntryStore
      .query()
      .index(TIME_ENTRY_INDEX.SYNCED)
      .wherePartitionKey(false)
      .exec();
    return entries.map(DB.mapDbToTimeEntry);
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'getUnsyncedTimeEntries', e);
  }
};

const getTimeEntriesWithStatus = async (
  status: typeof ENTRY_STATUSES[number],
): Promise<ITimeEntry[]> => {
  try {
    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    const entries = await timeEntryStore
      .query()
      .index(TIME_ENTRY_INDEX.STATUS)
      .wherePartitionKey(status)
      .exec();
    return entries.map(DB.mapDbToTimeEntry);
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'getTimeEntriesWithStatus', e);
  }
};

export default {
  timeEntry: {
    getAll: getAllTimeEntries,
    get: getTimeEntry,
    getUnsynced: getUnsyncedTimeEntries,
    getWithStatus: getTimeEntriesWithStatus,
  },
};

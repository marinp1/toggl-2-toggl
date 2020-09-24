import { DynamoStore } from '@shiftcoders/dynamo-easy';

import { TIME_ENTRY_INDEX } from '@utils/indices';
import { ITimeEntry, ENTRY_STATUSES, ITogglEntry } from '@types';
import { DatabaseError, DynamoDB, DB, togglEntryToDynamoEntry } from '@utils';

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

const getTimeEntries = async (ids: string[]): Promise<ITimeEntry[]> => {
  try {
    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    const entries = await timeEntryStore
      .batchGet(ids.map(id => ({ entryIdFrom: id })))
      .exec();
    return entries.map(DB.mapDbToTimeEntry);
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'getTimeEntries', e);
  }
};

const getUnsyncedTimeEntries = async (): Promise<ITimeEntry[]> => {
  try {
    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    const entries = await timeEntryStore
      .query()
      .index(TIME_ENTRY_INDEX.SYNCED)
      .wherePartitionKey(0)
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

const createNewTimeEntry = async (entry: ITogglEntry): Promise<ITimeEntry> => {
  try {
    const dbEntry = togglEntryToDynamoEntry(
      entry,
      'created',
      new Date().toISOString(),
    );

    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    await timeEntryStore.put(dbEntry).exec();
    return DB.mapDbToTimeEntry(dbEntry);
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'createNewTimeEntry', e);
  }
};

const updateTimeEntry = async (entry: ITogglEntry): Promise<ITimeEntry> => {
  try {
    const dbEntry = togglEntryToDynamoEntry(
      entry,
      'created',
      new Date().toISOString(),
    );
    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);

    const currentEntry = await timeEntryStore.get(dbEntry.entryIdFrom).exec();

    const entryCreated = currentEntry && currentEntry.entryIdTo !== undefined;
    const status = entryCreated ? ENTRY_STATUSES[2] : ENTRY_STATUSES[0];

    await timeEntryStore
      .update(dbEntry.entryIdFrom)
      .updateAttribute('isThesisEntry')
      .set(dbEntry.isThesisEntry)
      .updateAttribute('secondsLogged')
      .set(dbEntry.secondsLogged)
      .updateAttribute('startDateTime')
      .set(dbEntry.startDateTime)
      .updateAttribute('stopDateTime')
      .set(dbEntry.stopDateTime)
      .updateAttribute('updateDateTime')
      .set(dbEntry.updateDateTime)
      .updateAttribute('status')
      .set(status)
      .updateAttribute('synced')
      .set(0)
      .exec();
    return DB.mapDbToTimeEntry(dbEntry);
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'createNewTimeEntry', e);
  }
};

const linkToSynced = async (
  entryIdFrom: string,
  entryIdTo: string,
  description: string,
): Promise<ITimeEntry> => {
  try {
    const entryBefore = await getTimeEntry(entryIdFrom);
    if (!entryBefore) {
      throw new Error('Failed to sync!');
    }

    const timeEntryStore = new DynamoStore(DB.TimeEntry, DynamoDB.raw);
    await timeEntryStore
      .update(entryIdFrom)
      .updateAttribute('entryIdTo')
      .set(entryIdTo)
      .updateAttribute('resolvedEntryName')
      .set(description)
      .updateAttribute('status')
      .set(ENTRY_STATUSES[0])
      .updateAttribute('synced')
      .set(1)
      .exec();

    const entryAfter = await getTimeEntry(entryIdFrom);
    if (!entryAfter) {
      throw new Error('This error should not happen!');
    }
    return entryAfter;
  } catch (e) {
    throw new DatabaseError('TimeEntries', 'createNewTimeEntry', e);
  }
};

export default {
  timeEntry: {
    getAll: getAllTimeEntries,
    get: getTimeEntry,
    getBatch: getTimeEntries,
    getUnsynced: getUnsyncedTimeEntries,
    getWithStatus: getTimeEntriesWithStatus,
    create: createNewTimeEntry,
    update: updateTimeEntry,
    link: linkToSynced,
  },
};

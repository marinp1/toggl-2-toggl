import * as _ from 'lodash';
import {
  IResponse,
  ILambdaEvent,
  ITimeEntry,
  ITogglEntry,
  ENTRY_STATUSES,
} from '@types';
import { LambdaUtils } from '@utils';
import db from './db';

import API from './api';

interface GetApiVersionResponse {
  API_VERSION: string;
  STAGE: string;
}

export const getApiVersion = async (
  event: ILambdaEvent<{}>,
): IResponse<GetApiVersionResponse> => {
  // eslint-disable-next-line no-console
  console.log(event);
  const { API_VERSION, APP_STAGE } = process.env;

  if (!!API_VERSION && !!APP_STAGE) {
    return LambdaUtils.sendSuccessResponse<GetApiVersionResponse>({
      API_VERSION,
      STAGE: APP_STAGE,
    });
  }

  // eslint-disable-next-line no-console
  console.log('API version or stage not found in environment variables');
  return LambdaUtils.sendErrorResponse('Internal server error');
};

interface GetEntriesResponse {
  count: number;
  entries: ITimeEntry[];
}

export const getTimeEntries = async (
  event: ILambdaEvent<{}>,
): IResponse<GetEntriesResponse> => {
  // eslint-disable-next-line no-console
  console.log(event);
  try {
    const entries = await db.timeEntry.getAll();
    return LambdaUtils.sendSuccessResponse<GetEntriesResponse>({
      count: entries.length,
      entries: _.sortBy(entries, e => e.creationDateTime.valueOf()).reverse(),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

export const getTimeEntry = async (
  event: ILambdaEvent<{}>,
): IResponse<ITimeEntry> => {
  // eslint-disable-next-line no-console
  console.log(event);
  try {
    const { entryId } = event.pathParameters;
    if (!entryId) {
      return LambdaUtils.sendSuccessResponse({
        code: -200,
        message: `Missing path parameter entryId`,
      });
    }
    const entry = await db.timeEntry.get(entryId);
    if (!entry) {
      return LambdaUtils.sendNotFoundResponse(
        `Could not find entry with ID ${entryId}`,
      );
    }
    return LambdaUtils.sendSuccessResponse(entry);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

export const getUnsyncedTimeEntries = async (
  event: ILambdaEvent<{}>,
): IResponse<ITimeEntry[]> => {
  // eslint-disable-next-line no-console
  console.log(event);
  try {
    const entries = await db.timeEntry.getUnsynced();
    return LambdaUtils.sendSuccessResponse<ITimeEntry[]>(entries);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

export const getTimeEntriesWithStatus = async (
  event: ILambdaEvent<{}>,
): IResponse<ITimeEntry[]> => {
  // eslint-disable-next-line no-console
  console.log(event);
  try {
    const { status } = event.pathParameters;
    if (!status) {
      return LambdaUtils.sendSuccessResponse({
        code: -200,
        message: `Missing path parameter status`,
      });
    }
    const modifiedStatus = status.toLowerCase() as typeof ENTRY_STATUSES[number];
    if (!ENTRY_STATUSES.includes(modifiedStatus)) {
      return LambdaUtils.sendSuccessResponse({
        code: -200,
        message: `Invalid path parameter status, valid statuses are ${ENTRY_STATUSES.join(
          ', ',
        )}`,
      });
    }
    const entries = await db.timeEntry.getWithStatus(modifiedStatus);
    return LambdaUtils.sendSuccessResponse<ITimeEntry[]>(entries);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

const hoursToMilliseconds = (days: number): number => {
  return days * 24 * 3600 * 1000;
};

export const getTogglEntries = async (
  event: ILambdaEvent<{}>,
): IResponse<ITogglEntry[]> => {
  // eslint-disable-next-line no-console
  console.log(event);
  try {
    const { days } = event.pathParameters;
    if (
      days === undefined ||
      Number(days) === undefined ||
      Number(days) < 0 ||
      Number(days) > 7
    ) {
      return LambdaUtils.sendSuccessResponse({
        code: -200,
        message: `Missing or invalid path parameter days`,
      });
    }
    const now = Date.now();
    const startDate = new Date(
      new Date(now - hoursToMilliseconds(Number(days))).setHours(0, 0, 0),
    );
    const endDate = new Date(new Date().setHours(23, 59, 59));
    const entries = await API.Toggl.getTogglEntries({
      startDate,
      endDate,
    });
    return LambdaUtils.sendSuccessResponse<ITogglEntry[]>(entries);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

type SyncResponse = Record<typeof ENTRY_STATUSES[number], number> & {
  total: number;
  existing: number;
  dryrun: boolean;
  dynamo?: {
    created: number;
    updated: number;
    deleted: number;
  };
};

export const syncLatestEntriesToDatabase = async (
  event: ILambdaEvent<{}>,
): IResponse<SyncResponse> => {
  // eslint-disable-next-line no-console
  console.log(event);
  try {
    const dryrun =
      event.queryStringParameters &&
      (event.queryStringParameters.dryrun === 'true' ||
        event.queryStringParameters.dryrun === '1');

    const now = Date.now();
    const startDate = new Date(
      new Date(now - hoursToMilliseconds(1)).setHours(0, 0, 0),
    );
    const endDate = new Date(new Date().setHours(23, 59, 59));
    const entries = await API.Toggl.getTogglEntries({
      startDate,
      endDate,
    });
    const dbEntries = await db.timeEntry.getBatch(entries.map(e => e.id));
    const dbEntryIds = dbEntries.map(e => e.entryIdFrom);

    const created = entries.filter(e => !dbEntryIds.includes(e.id));
    const updated = _.intersectionWith<ITogglEntry, ITimeEntry>(
      entries,
      dbEntries,
      (a, b) => {
        return (
          a.id === b.entryIdFrom &&
          (a.secondsLogged !== b.secondsLogged ||
            a.isThesisEntry !== b.isThesisEntry)
        );
      },
    );

    const usedIds = [...updated, ...created].map(e => e.id);
    const existing = entries.filter(e => !usedIds.includes(e.id));

    const response: SyncResponse = {
      total: entries.length,
      created: created.length,
      updated: updated.length,
      existing: existing.length,
      deleted: -1,
      dryrun: !!dryrun,
    };

    if (!dryrun) {
      if (created.length + updated.length === 0) {
        response.dynamo = {
          created: 0,
          updated: 0,
          deleted: -1,
        };
      } else {
        const createPromises = created.map(async e => {
          return db.timeEntry.create(e);
        });
        const updatePromises = updated.map(async e => {
          return db.timeEntry.update(e);
        });

        const createdEntries = await Promise.all(createPromises);
        const updatedEntries = await Promise.all(updatePromises);

        response.dynamo = {
          created: createdEntries.length,
          updated: updatedEntries.length,
          deleted: -1,
        };
      }
    }

    return LambdaUtils.sendSuccessResponse<SyncResponse>(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

interface SyncResultMessage {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  message: string;
}

export const syncDatabaseEntriesToToggl = async (
  event: ILambdaEvent<{}>,
): IResponse<SyncResultMessage | string> => {
  // eslint-disable-next-line no-console
  console.log(event);
  try {
    const unsynced = await db.timeEntry.getUnsynced();
    if (unsynced.length === 0) {
      return LambdaUtils.sendEmptySuccessResponse('Nothing to sync');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    let synced = 0;

    for (let i = 0; i < unsynced.length; i++) {
      const elem = unsynced[i];

      let togglEntry: ITogglEntry | null = null;

      if (elem.status === 'created') {
        togglEntry = await API.Toggl.createTogglEntry(elem);
        created += 1;
      } else if (elem.status === 'updated') {
        togglEntry = await API.Toggl.updateTogglEntry(elem);
        updated += 1;
      }

      if (!togglEntry) {
        console.log(`Skipped entry ${JSON.stringify(elem, null, 2)}`);
        skipped += 1;
      } else {
        await db.timeEntry.link(
          elem.entryIdFrom,
          togglEntry.id,
          togglEntry.description,
        );
        synced += 1;
        console.log(`Linked entry`, elem.entryIdFrom, 'to', togglEntry.id);
      }
    }

    if (synced !== created + updated) {
      throw new Error('Sync count did not match update count, check data!');
    }

    return LambdaUtils.sendSuccessResponse<SyncResultMessage>({
      total: created + updated + skipped,
      created,
      updated,
      skipped,
      message: `Sync successful!`,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

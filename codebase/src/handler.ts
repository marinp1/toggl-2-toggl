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
      new Date(now - hoursToMilliseconds(2)).setHours(0, 0, 0),
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
      // TODO:
    }

    return LambdaUtils.sendSuccessResponse<SyncResponse>(response);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return LambdaUtils.sendErrorResponse('Internal server error');
  }
};

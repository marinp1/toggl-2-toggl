import { formatDistance, formatISO } from 'date-fns';
import { successResponse, errorResponse } from 'service/lambda-helpers';
import { LambdaEvent, LambdaResponse } from 'service/types';

interface AppInformation {
  metrics: {
    lastFetched: string;
    lastMigrated: string;
    totalEntries: number;
  };
  status: {
    entriesWaiting: number;
    nextFetchIn: string;
    nextMigrationIn: string;
  };
}

export const generateDateString = (date: Date | number) => {
  const readable = formatDistance(date, Date.now(), { addSuffix: true });
  return `${formatISO(date)} (${readable})`;
};

export const getMetrics = async (
  event: LambdaEvent,
): LambdaResponse<AppInformation> => {
  try {
    const metrics: AppInformation['metrics'] = {
      lastFetched: generateDateString(Date.now() - 100000),
      lastMigrated: generateDateString(Date.now() - 2000000),
      totalEntries: 10,
    };
    const status: AppInformation['status'] = {
      entriesWaiting: 10,
      nextFetchIn: generateDateString(Date.now() + 20000),
      nextMigrationIn: generateDateString(Date.now() + 500000),
    };
    return successResponse({ metrics, status });
  } catch (e) {
    return errorResponse(e);
  }
};

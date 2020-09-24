import { LambdaEvent, LambdaResponse } from "types";

import { successResponse, generateDateString } from "../util";

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

export const getMetrics = async (
  event: LambdaEvent
): LambdaResponse<AppInformation> => {
  const metrics: AppInformation["metrics"] = {
    lastFetched: await generateDateString(Date.now() - 100000),
    lastMigrated: await generateDateString(Date.now() - 2000000),
    totalEntries: 10,
  };
  const status: AppInformation["status"] = {
    entriesWaiting: 10,
    nextFetchIn: await generateDateString(Date.now() + 20000),
    nextMigrationIn: await generateDateString(Date.now() + 500000),
  };
  return successResponse({ metrics, status });
};

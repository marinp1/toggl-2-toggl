import { LambdaEvent, LambdaResponse } from "types";

import { successResponse, generateDateString } from "../util";

export const ping = async (event: LambdaEvent): LambdaResponse<string> =>
  successResponse("pong");

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
    lastFetched: generateDateString(Date.now() - 100000),
    lastMigrated: generateDateString(Date.now() - 2000000),
    totalEntries: 10,
  };
  const status: AppInformation["status"] = {
    entriesWaiting: 10,
    nextFetchIn: generateDateString(Date.now() + 20000),
    nextMigrationIn: generateDateString(Date.now() + 500000),
  };
  return successResponse({ metrics, status });
};

import { LambdaEvent, LambdaResponse } from "types";

import utils from "../util";

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
    lastFetched: await utils.generateDateString(Date.now() - 100000),
    lastMigrated: await utils.generateDateString(Date.now() - 2000000),
    totalEntries: 10,
  };
  const status: AppInformation["status"] = {
    entriesWaiting: 10,
    nextFetchIn: await utils.generateDateString(Date.now() + 20000),
    nextMigrationIn: await utils.generateDateString(Date.now() + 500000),
  };
  return utils.successResponse({ metrics, status });
};

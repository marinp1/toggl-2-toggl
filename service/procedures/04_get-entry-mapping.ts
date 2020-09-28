import { TimeEntryResponse } from 'toggl-api/types';
import { DynamoMapRow } from '../types';
import { batchGetDynamoItems } from '../aws-helpers';

export const getEntryMappings = (
  sourceEntries: TimeEntryResponse[],
): Promise<DynamoMapRow[]> => {
  const spaceIds = sourceEntries
    .flatMap((a) => [
      {
        wid: String(a.wid),
        pid: a.pid ? String(a.pid) : '*',
      },
      {
        wid: String(a.wid),
        pid: '*',
      },
    ])
    .uniqBy(({ wid, pid }) => `${wid}${pid}`);

  // Entry mappings for workspace IDs
  return batchGetDynamoItems<DynamoMapRow>({
    tableName: process.env.DYNAMO_MAPPING_TABLE_NAME,
    hashKeyName: 'sourceWid',
    rangeKeyName: 'sourcePid',
    valuesToFind: spaceIds.map(({ wid, pid }) => ({
      hashKey: wid,
      rangeKey: pid,
    })),
  });
};

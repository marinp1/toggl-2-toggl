import * as AWS from 'aws-sdk';

import {
  TableNameResolver,
  updateDynamoEasyConfig,
} from '@shiftcoders/dynamo-easy';

AWS.config.update({ region: 'eu-central-1' });

export const tableNameResolver: TableNameResolver = (tableName: string) => {
  const { APP_NAME, APP_STAGE } = process.env;
  if (!APP_NAME || !APP_STAGE) {
    throw new Error('Missing environment variables');
  }
  return `${APP_NAME}-${APP_STAGE}-${tableName}`;
};

updateDynamoEasyConfig({
  tableNameResolver,
});

export * from './timeEntry';

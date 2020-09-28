import AWS from 'aws-sdk';

import { ConfigurationError } from '../../errors';

export const getDynamoClient = () => {
  const { APP_REGION } = process.env;
  if (!APP_REGION) {
    throw new ConfigurationError('APP_REGION environment variable missing');
  }
  return new AWS.DynamoDB({
    region: 'eu-central-1',
  });
};

import AWS from 'aws-sdk';

export const getDynamoClient = () => {
  const { APP_REGION } = process.env;
  if (!APP_REGION) {
    throw new Error('APP_REGION environment variable missing');
  }
  return new AWS.DynamoDB({
    region: 'eu-central-1',
  });
};

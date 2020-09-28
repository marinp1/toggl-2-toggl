import AWS from 'aws-sdk';

import { ConfigurationError, InvalidRequestError } from '../errors';

export const getSSMParameters = async (...parameterNames: string[]) => {
  const { APP_NAME, APP_STAGE } = process.env;
  if (!APP_NAME || !APP_STAGE) {
    throw new ConfigurationError('Missing environment variables');
  }

  const SSM = new AWS.SSM();

  const data = await SSM.getParameters({
    Names: [`${APP_NAME}-${APP_STAGE}`],
    WithDecryption: true,
  }).promise();

  const parameters =
    data.Parameters && data.Parameters[0].Value?.split(/[\r\n]+/);

  if (!parameters) {
    throw new InvalidRequestError(
      `Failed to find SSM parameter with name ${APP_NAME}-${APP_STAGE}`,
      -1,
    );
  }

  const response = parameters.reduce<{ [paramName: string]: string }>(
    (prev, param) => {
      const [name, ...rest] = param.split('=');
      return {
        ...prev,
        [name.trim()]: rest.join('').trim(),
      };
    },
    {},
  );

  if (parameterNames.some((paramName) => !response[paramName])) {
    console.debug(`Found keys ${Object.keys(response).join(',')}`);

    throw new InvalidRequestError(
      `Some of the parameters were not found from SSM [${parameterNames.join(
        ', ',
      )}], please validate that configuration is correct.`,
      -1,
    );
  }

  return response as {
    [paramName: string]: string;
  };
};

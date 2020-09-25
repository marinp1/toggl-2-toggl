import AWS from 'aws-sdk';

export const getSSMParameters = async (...parameterNames: string[]) => {
  const { APP_NAME, APP_STAGE } = process.env;
  if (!APP_NAME || !APP_STAGE) {
    throw new Error('Missing environment variables');
  }

  const SSM = new AWS.SSM();

  const data = await SSM.getParameters({
    Names: [`${APP_NAME}-${APP_STAGE}`],
  }).promise();

  const parameters = data.Parameters && data.Parameters[0].Value?.split('/n');

  if (!parameters) {
    throw new Error(
      `Failed to find SSM parameter with name ${APP_NAME}-${APP_STAGE}`,
    );
  }

  const response = parameters.reduce<{ [paramName: string]: string }>(
    (prev, param) => {
      const [name, value] = param
        .split('=')
        .map(([name, ...rest]) => [name, rest.join('')])
        .flat();
      return {
        ...prev,
        [name.trim()]: value.trim(),
      };
    },
    {},
  );

  if (parameterNames.some((paramName) => !response[paramName])) {
    console.debug(`Found keys ${Object.keys(response).join(',')}`);

    throw new Error(
      `Some of the parameters were not found from SSM [${parameterNames.join(
        ', ',
      )}], please validate that configuration is correct.`,
    );
  }

  return response as {
    [paramName: string]: string;
  };
};

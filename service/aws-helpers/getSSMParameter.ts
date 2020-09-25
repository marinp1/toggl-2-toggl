import AWS from 'aws-sdk';

export const getSSMParameters = async (...parameterNames: string[]) => {
  const { APP_NAME, APP_STAGE } = process.env;
  if (!APP_NAME || !APP_STAGE) {
    throw new Error('Missing environment variables');
  }

  const SSM = new AWS.SSM();

  const data = await SSM.getParameters({
    Names: parameterNames.map((param) => `${APP_NAME}/${APP_STAGE}/${param}`),
  }).promise();

  if (!data.Parameters) {
    return {};
  }

  const response = data.Parameters.reduce<{
    [paramName: string]: string | undefined;
  }>(
    (prev, cur) => ({
      ...prev,
      [String(cur.Name).replace(`${APP_NAME}/${APP_STAGE}/`, '')]: cur.Value,
    }),
    {},
  );

  if (parameterNames.some((paramName) => !response[paramName])) {
    throw new Error(
      `Some of the parameters were not found from SSM [${parameterNames.join(
        ', ',
      )}], make sure that the parameter names do not include app name or stage.`,
    );
  }

  return response as {
    [paramName: string]: string;
  };
};

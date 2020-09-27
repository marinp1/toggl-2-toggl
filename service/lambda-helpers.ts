import { BaseError } from './errors/BaseError';
import { LambdaSuccessResponse, LambdaErrorResponse } from './types';

export const successResponse = <T extends Record<string, any> | null | string>(
  body: T,
): Promise<LambdaSuccessResponse<T>> =>
  Promise.resolve({
    statusCode: 200,
    body:
      typeof body === 'string' || body === null
        ? (body as string | null)
        : JSON.stringify(body),
    headers: {
      'Content-Type':
        typeof body === 'string' ? 'text/plain' : 'application/json',
    },
  });

export const errorResponse = (err: Error): Promise<LambdaErrorResponse> => {
  console.error(err);
  if (err instanceof BaseError) {
    return Promise.resolve({
      statusCode: err.httpCode,
      body: JSON.stringify({
        code: err.errorCode,
        message: err.message,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  return Promise.resolve({
    statusCode: 500,
    body: JSON.stringify({
      code: -1,
      message: 'Unhandled exception occured, check logs for more information',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

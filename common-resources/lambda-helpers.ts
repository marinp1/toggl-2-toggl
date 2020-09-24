import { LambdaSuccessResponse } from './types';

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

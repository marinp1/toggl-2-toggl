import https from 'https';

import { FetchResponse } from './types';

type FetchOptions<T> = {
  url?: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'GET';
  headers: Record<string, string>;
  data?: T;
};

export const fetch = <ResponseType, T>(
  options: FetchOptions<T>,
): Promise<FetchResponse<ResponseType>> => {
  const stringifiedData = options.data
    ? JSON.stringify<any>(options.data)
    : undefined;

  const requestOptions: https.RequestOptions = {
    hostname: 'api.track.toggl.com',
    method: options.method,
    path: `/api/v8/time_entries${options.url || '/'}`,
    headers: {
      ...options.headers,
    },
  };

  if (stringifiedData && requestOptions.headers) {
    requestOptions.headers['Content-Length'] = stringifiedData.length;
  }

  return new Promise((resolve) => {
    const request = https.request(requestOptions, (res) => {
      res.on('data', (data) => {
        return resolve({
          statusCode: res.statusCode || 500,
          statusText: res.statusMessage || 'unknown',
          body: typeof data === 'object' ? JSON.parse(data) : data,
        });
      });

      request.on('error', (err) => {
        return resolve({
          statusCode: res.statusCode || 500,
          statusText: res.statusMessage || 'unknown',
          error: err,
        });
      });
    });

    stringifiedData && request.write(stringifiedData);
    request.end();
  });
};

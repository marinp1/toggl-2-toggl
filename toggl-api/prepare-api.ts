import fetch from 'node-fetch';
import { ApiCall, TypedResponse, ApiMethod } from './types';

type TogglWrapper<T> = {
  data: T;
};

const handleResponse = <T>(resp: TypedResponse<T>) => {
  switch (resp.status) {
    case 200:
      return resp.json();
    default:
      console.log(resp);
      throw new Error(`Received status code ${resp.status}`);
  }
};

const constructApi = (togglApiToken: string): ApiCall => {
  if (!togglApiToken) {
    throw new Error('No API token given!');
  }

  const headers = {
    Authorization:
      'Basic ' + Buffer.from(togglApiToken + ':api_token').toString('base64'),
    'Content-Type': 'application/json',
  };

  return {
    get: <T>(endpoint: string) =>
      (fetch(endpoint, {
        headers,
        method: 'GET',
      }) as Promise<TypedResponse<TogglWrapper<T>>>)
        .then(handleResponse)
        .then((data) => data.data),
    getMultiple: <T>(endpoint: string) =>
      (fetch(endpoint, {
        headers,
        method: 'GET',
      }) as Promise<TypedResponse<T[]>>).then(handleResponse),
    post: <T, U>(endpoint: string, body: U) =>
      (fetch(endpoint, {
        headers,
        body: JSON.stringify(body) as string,
        method: 'POST',
      }) as Promise<TypedResponse<TogglWrapper<T>>>)
        .then(handleResponse)
        .then((data) => data.data),
  };
};

export const prepareApi = <T, U extends any[]>(
  method: ApiMethod<T, U>,
  apiToken: string,
) => method(constructApi(apiToken));

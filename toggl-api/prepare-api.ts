import { ApiCall, TypedResponse } from './types';

type TogglWrapper<T> = {
  data: T;
};

export const prepareApi = (togglApiToken: string): ApiCall => {
  const headers = new Headers();
  headers.set(
    'Authorization',
    'Basic ' + Buffer.from(togglApiToken + ':api_token').toString('base64'),
  );
  headers.set('Content-Type', 'application/json');
  return {
    get: <T>(endpoint: string) =>
      (fetch(endpoint, {
        headers,
        method: 'GET',
      }) as Promise<TypedResponse<TogglWrapper<T>>>)
        .then((resp) => resp.json())
        .then((data) => data.data),
    getMultiple: <T>(endpoint: string) =>
      (fetch(endpoint, {
        headers,
        method: 'GET',
      }) as Promise<TypedResponse<T[]>>).then((resp) => resp.json()),
    post: <T, U>(endpoint: string, body: U) =>
      (fetch(endpoint, {
        headers,
        body: JSON.stringify(body) as string,
        method: 'POST',
      }) as Promise<TypedResponse<TogglWrapper<T>>>)
        .then((resp) => resp.json())
        .then((data) => data.data),
  };
};

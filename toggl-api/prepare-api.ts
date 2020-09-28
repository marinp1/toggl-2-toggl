import { fetch } from './personal-fetch';

import { ConfigurationError } from 'service/errors';

import {
  ApiCall,
  ApiMethod,
  ErrorResponse,
  ApiCallErrorResponse,
  ApiCallSuccessResponse,
  FetchResponse,
} from './types';

type TogglWrapper<T> = {
  data: T;
};

const handleResponse = <T>(resp: FetchResponse<T>): T | ErrorResponse => {
  switch (resp.statusCode) {
    case 200:
      return (resp.body as unknown) as T;
    default:
      console.debug(JSON.stringify({ togglResponse: resp }));
      return {
        error: true,
        statusCode: resp.statusCode,
        statusText: resp.statusText,
      };
  }
};

const isResponseError = (resp: any | ErrorResponse): resp is ErrorResponse =>
  !!(resp as ErrorResponse).error;

const isResponseWrapped = <T>(
  resp: T | TogglWrapper<T>,
): resp is TogglWrapper<T> => !!(resp as TogglWrapper<T>).data;

const mapResponse = <T>(
  response: ErrorResponse | TogglWrapper<T> | T,
): ApiCallErrorResponse | ApiCallSuccessResponse<T> => {
  return isResponseError(response)
    ? { error: response, data: null }
    : {
        data: isResponseWrapped(response) ? response.data : response,
        error: null,
      };
};

const constructApi = (togglApiToken: string): ApiCall => {
  if (!togglApiToken) {
    throw new ConfigurationError('No Toggl API token given!');
  }

  const headers = {
    Authorization:
      'Basic ' + Buffer.from(togglApiToken + ':api_token').toString('base64'),
    'Content-Type': 'application/json',
  };

  return {
    get: <T>(endpoint: string) =>
      fetch<TogglWrapper<T>, T>({
        url: endpoint,
        headers,
        method: 'GET',
      })
        .then(handleResponse)
        .then(mapResponse),
    getMultiple: <T>(endpoint: string) =>
      fetch<T[], T>({
        url: endpoint,
        headers,
        method: 'GET',
      })
        .then(handleResponse)
        .then(mapResponse),
    post: <T, U extends object>(endpoint: string, body: U) =>
      fetch<TogglWrapper<T>, { time_entry: U }>({
        url: endpoint,
        headers,
        data: { time_entry: body },
        method: 'POST',
      })
        .then(handleResponse)
        .then(mapResponse),
    put: <T, U>(endpoint: string, body: U) =>
      fetch<TogglWrapper<T>, { time_entry: U }>({
        url: endpoint,
        headers,
        data: { time_entry: body },
        method: 'PUT',
      })
        .then(handleResponse)
        .then(mapResponse),
    delete: (endpoint: string) =>
      fetch({
        url: endpoint,
        headers,
        method: 'DELETE',
      })
        .then(handleResponse)
        .then(mapResponse),
  };
};

export const prepareApi = <T, U extends any[]>(
  method: ApiMethod<T, U>,
  apiToken: string,
) => method(constructApi(apiToken));

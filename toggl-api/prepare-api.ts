import fetch from 'node-fetch';
import { ConfigurationError } from 'service/errors';

import {
  ApiCall,
  TypedResponse,
  ApiMethod,
  ErrorResponse,
  ApiCallErrorResponse,
  ApiCallSuccessResponse,
} from './types';

type TogglWrapper<T> = {
  data: T;
};

const handleResponse = <T>(
  resp: TypedResponse<T>,
): Promise<T | ErrorResponse> => {
  switch (resp.status) {
    case 200:
      return resp.json();
    default:
      return Promise.resolve({
        error: true,
        statusCode: resp.status,
        statusText: resp.statusText,
      });
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
      (fetch(endpoint, {
        headers,
        method: 'GET',
      }) as Promise<TypedResponse<TogglWrapper<T>>>)
        .then(handleResponse)
        .then(mapResponse),
    getMultiple: <T>(endpoint: string) =>
      (fetch(endpoint, {
        headers,
        method: 'GET',
      }) as Promise<TypedResponse<T[]>>)
        .then(handleResponse)
        .then(mapResponse),
    post: <T, U>(endpoint: string, body: U) =>
      (fetch(endpoint, {
        headers,
        body: JSON.stringify(body) as string,
        method: 'POST',
      }) as Promise<TypedResponse<TogglWrapper<T>>>)
        .then(handleResponse)
        .then(mapResponse),
  };
};

export const prepareApi = <T, U extends any[]>(
  method: ApiMethod<T, U>,
  apiToken: string,
) => method(constructApi(apiToken));

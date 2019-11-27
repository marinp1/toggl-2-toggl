import { TogglApiResponse, TogglApiError } from '@types';

export const generateApiQueryString = (req: object): string =>
  Object.entries(req)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');

export const isTogglApiError = (
  res: TogglApiResponse<object, object>,
): res is TogglApiError => {
  return !!(res as TogglApiError).error;
};

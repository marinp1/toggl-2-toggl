import { BaseError, HTTP_ERROR_RESPONSE_CODE } from './BaseError';

export class TogglError extends BaseError {
  constructor(message: string, togglResponseStatusCode: number) {
    super(
      `[${togglResponseStatusCode}] ${message}`,
      HTTP_ERROR_RESPONSE_CODE.BAD_GATEWAY,
    );
  }
}

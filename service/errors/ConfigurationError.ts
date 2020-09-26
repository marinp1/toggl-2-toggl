import { BaseError, HTTP_ERROR_RESPONSE_CODE } from './BaseError';

export class ConfigurationError extends BaseError {
  constructor(message: string) {
    super(message, HTTP_ERROR_RESPONSE_CODE.INTERNAL_SERVER_ERROR);
  }
}

import { BaseError, HTTP_ERROR_RESPONSE_CODE } from './BaseError';

export class ServerError extends BaseError {
  constructor(message: string, errorCode: number) {
    super(message, HTTP_ERROR_RESPONSE_CODE.INTERNAL_SERVER_ERROR, errorCode);
  }
}

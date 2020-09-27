import { BaseError, HTTP_ERROR_RESPONSE_CODE } from './BaseError';

export class InvalidRequestError extends BaseError {
  constructor(message: string, errorCode: number) {
    super(message, HTTP_ERROR_RESPONSE_CODE.BAD_REQUEST, errorCode);
  }
}

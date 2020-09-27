import { BaseError, HTTP_ERROR_RESPONSE_CODE } from './BaseError';

export class DynamoError extends BaseError {
  constructor(message: string, errorCode: number) {
    super(message, HTTP_ERROR_RESPONSE_CODE.INTERNAL_SERVER_ERROR, errorCode);
  }
}

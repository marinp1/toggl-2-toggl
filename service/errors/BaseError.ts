export enum HTTP_ERROR_RESPONSE_CODE {
  BAD_REQUEST = 400,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
}

export abstract class BaseError extends Error {
  httpCode: HTTP_ERROR_RESPONSE_CODE;
  errorCode: number;

  constructor(message: string, httpCode: number, errorCode: number = -1) {
    super(message);
    console.error(this.stack);
    this.message = `[${new.target.name}] ${message}`;
    this.errorCode = errorCode;
    this.httpCode = httpCode;
  }
}

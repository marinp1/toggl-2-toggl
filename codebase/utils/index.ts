/* eslint-disable no-console */
import { DynamoDB as AWSDynamoDB } from 'aws-sdk';

import { IResponse, IError } from '@types';

import * as db from './models';
export * from './api';

const options = {
  region: 'localhost',
  endpoint: 'http://localhost:8000',
};

const isOffline = (): boolean => !!process.env.IS_OFFLINE;

export const DynamoDB = {
  doc: isOffline()
    ? new AWSDynamoDB.DocumentClient(options)
    : new AWSDynamoDB.DocumentClient(),
  raw: isOffline() ? new AWSDynamoDB(options) : new AWSDynamoDB(),
};

export class DatabaseError extends Error {
  constructor(tableName: string, command: string, originalError: Error) {
    console.error(
      'Database error occured:',
      JSON.stringify(
        {
          tableName,
          command,
          message: originalError.message,
        },
        null,
        2,
      ),
    );
    super('Internal server error');
  }
}

const sendFailureResponse = (
  statusCode: number,
  message: string,
): IResponse<IError> => {
  return Promise.resolve({
    statusCode,
    body: JSON.stringify({
      code: -1,
      message,
    }),
  });
};

const sendErrorResponse = (message: string): IResponse<IError> =>
  sendFailureResponse(500, message);

const sendNotFoundResponse = (message: string): IResponse<IError> =>
  sendFailureResponse(404, message);

const sendForbiddenResponse = (message: string): IResponse<IError> =>
  sendFailureResponse(403, message);

const sendSuccessResponse = <T>(body: T): IResponse<T> => {
  return Promise.resolve({
    statusCode: 200,
    body: JSON.stringify(body),
  });
};

export const LambdaUtils = {
  sendErrorResponse,
  sendForbiddenResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
};

export const DB = db;

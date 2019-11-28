export interface IError {
  code: number;
  message: string;
}

export interface ILambdaResponse<T> {
  statusCode: number;
  body: Stringified<T | IError>;
}

export type IResponse<T> = Promise<ILambdaResponse<T>>;

type QueryString = 'dryrun';

export interface ILambdaEvent<T> {
  pathParameters: { [param: string]: string };
  queryStringParameters: null | Partial<Record<QueryString, string>>;
  body: Stringified<T>;
  isOffline?: boolean;
}

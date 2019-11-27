export interface IError {
  code: number;
  message: string;
}

export interface ILambdaResponse<T> {
  statusCode: number;
  body: Stringified<T | IError>;
}

export type IResponse<T> = Promise<ILambdaResponse<T>>;

export interface ILambdaEvent<T> {
  pathParameters: { [param: string]: string };
  body: Stringified<T>;
  isOffline?: boolean;
}

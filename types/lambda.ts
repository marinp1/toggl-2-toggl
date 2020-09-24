type LambdaError = {
  code: number;
  message: string;
};

type LambdaResponseType = Record<string, any> | null | string;

type ContentType = "text/plain" | "application/json";

interface LambdaResponseBase {
  statusCode: number;
  body: string | Stringified<Record<string, any>> | null;
  headers: {
    "Content-Type": ContentType;
  };
}

export interface LambdaErrorResponse extends LambdaResponseBase {
  statusCode: 400 | 401 | 403 | 404 | 422 | 500 | 502 | 504;
  body: Stringified<LambdaError>;
  headers: {
    "Content-Type": "text/plain";
  };
}

export interface LambdaSuccessResponse<T extends LambdaResponseType = null>
  extends LambdaResponseBase {
  statusCode: 200 | 201;
  body: Stringified<T> | string | null;
  headers: {
    "Content-Type": ContentType;
  };
}

export type LambdaResponse<T extends LambdaResponseType = null> = Promise<
  LambdaSuccessResponse<T> | LambdaErrorResponse
>;

type QueryString = "dryrun";

export interface LambdaEvent<T extends Record<string, any> | null = null> {
  pathParameters: { [param: string]: string };
  queryStringParameters: null | Partial<Record<QueryString, string>>;
  body: Stringified<NonNullable<T>> | null;
}

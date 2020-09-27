import { Response } from 'node-fetch';

export type TypedResponse<T extends object | {} = {}> = Omit<
  Response,
  'json'
> & {
  json: () => Promise<T>;
};

export type ErrorResponse = {
  error: true;
  statusCode: number;
  statusText: string;
};

export type ApiCallSuccessResponse<T> = { data: T; error: null };
export type ApiCallErrorResponse = { data: null; error: ErrorResponse };

export type ApiCallResponse<T> =
  | ApiCallSuccessResponse<T>
  | ApiCallErrorResponse;

export type ApiCall = {
  get: <T = {}>(endpoint: string) => Promise<ApiCallResponse<T>>;
  delete: (
    endpoint: string,
  ) => Promise<ApiCallResponse<{ statusCode: number }>>;
  put: <T, U = {}>(endpoint: string, body: U) => Promise<ApiCallResponse<T>>;
  post: <T, U = {}>(endpoint: string, body: U) => Promise<ApiCallResponse<T>>;
  getMultiple: <T = {}>(endpoint: string) => Promise<ApiCallResponse<T[]>>;
};

export type ApiMethod<T, U extends any[]> = (
  apiCall: ApiCall,
) => (...params: U) => Promise<T>;

type RequiredTimeEntryProperties = {
  /* (string, strongly suggested to be used) */
  description: string;
  /* time entry start time (string, required, ISO 8601 date and time) */
  start: string;
  /* time entry duration in seconds.
    If the time entry is currently running, the duration attribute
    contains a negative value, denoting the start of the time entry
    in seconds since epoch (Jan 1 1970).
    The correct duration can be calculated as current_time + duration,
    where current_time is the current time in seconds since epoch.
    (integer, required) */
  duration: number;
};

type OptionalTimeEntryProperties = Partial<{
  id: number;
  /* workspace ID (integer, required if pid or tid not supplied) */
  wid: number;
  /*  project ID (integer, not required) */
  pid: number;
  /* task ID (integer, not required) */
  tid: number;
  /* (boolean, not required, default false, available for pro workspaces) */
  billable: boolean;
  /* time entry stop time (string, not required, ISO 8601 date and time) */
  stop: string;
  /* a list of tag names (array of strings, not required) */
  tags: string[];
  /* should Toggl show the start and stop time of this time entry?
    (boolean, not required) */
  duronly: boolean;
  /* timestamp that is sent in the response, indicates the time
    item was last updated */
  at: string;
  /* the name of your client app (string, required) */
  created_with: string;
}>;

export type TimeEntryResponse = RequiredTimeEntryProperties &
  Required<Pick<OptionalTimeEntryProperties, 'id' | 'wid' | 'at' | 'duronly'>> &
  Pick<
    OptionalTimeEntryProperties,
    'billable' | 'stop' | 'tags' | 'pid' | 'tid'
  >;

export type TimeEntryRequest = RequiredTimeEntryProperties &
  Required<Pick<OptionalTimeEntryProperties, 'wid' | 'created_with'>> &
  Pick<
    OptionalTimeEntryProperties,
    'billable' | 'pid' | 'tags' | 'duronly' | 'stop'
  >;

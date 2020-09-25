import { Response } from 'node-fetch';

export type TypedResponse<T extends object | {} = {}> = Omit<
  Response,
  'json'
> & {
  json: () => Promise<T>;
};

export type ApiCall = {
  get: <T = {}>(endpoint: string) => Promise<T>;
  post: <T, U = {}>(endpoint: string, body: U) => Promise<T>;
  getMultiple: <T = {}>(endpoint: string) => Promise<T[]>;
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
  /* the name of your client app (string, required) */
  created_with: string;
};

type OptionalTimeEntryProperties = Partial<{
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
}>;

export type TimeEntryResponse = RequiredTimeEntryProperties &
  Required<Pick<OptionalTimeEntryProperties, 'wid' | 'pid' | 'tid' | 'at'>> &
  Pick<OptionalTimeEntryProperties, 'billable' | 'stop' | 'tags'>;

type RunningTimeEntryRequest = RequiredTimeEntryProperties &
  Required<Pick<OptionalTimeEntryProperties, 'wid' | 'tid' | 'pid'>> &
  Pick<OptionalTimeEntryProperties, 'billable' | 'tags' | 'duronly'>;

type CompletedTimeEntryRequest = RunningTimeEntryRequest &
  Required<Pick<OptionalTimeEntryProperties, 'stop'>>;

export type TimeEntryRequest =
  | RunningTimeEntryRequest
  | CompletedTimeEntryRequest;
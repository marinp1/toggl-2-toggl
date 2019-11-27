export interface TogglGetTimeEntriesBody {
  start_date: string;
  end_date: string;
}

interface TogglTimeEntryRequiredBody {
  id: number;
  created_with: string;
  description: string;
  wid: number;
  billable?: boolean;
  duration: number;
  at: string;
}

interface TogglTimeEntryOptionalBody {
  start?: string;
  stop?: string;
  pid?: number;
  tid?: number;
  tags?: string[];
  duronly?: boolean;
}

export type TogglTimeEntryBody = TogglTimeEntryRequiredBody &
  TogglTimeEntryOptionalBody;

export interface TogglApiSuccess<T> {
  total_grand: null | number;
  total_billable: null | number;
  total_currencies: [{ currency: null | number; amount: null | number }];
  data: T;
}

export interface TogglApiError {
  error: {
    message: string;
    tip: string;
    code: number;
  };
}

export type TogglApiResponse<T> = TogglApiSuccess<T> | TogglApiError;
export type TogglApiPlainResponse<T> = T | TogglApiError;

declare namespace NodeJS {
  export interface ProcessEnv {
    TELEGRAM_API_TOKEN: string;
    TOGGL_API_TOKEN_FROM: string;
    TOGGL_THESIS_PROJECT_ID_FROM: string;
    TOGGL_API_TOKEN_TO: string;
    TOGGL_WORKSPACE_ID_TO: string;
    TOGGL_THESIS_PROJECT_ID_TO: string;
  }
}

declare namespace NodeJS {
  export interface ProcessEnv {
    APP_VERSION: string;
    APP_NAME: string;
    APP_STAGE: string;
    DYNAMO_ENTRIES_TABLE_NAME: string;
    DYNAMO_MAPPING_TABLE_NAME: string;
    DYNAMO_TASKS_TABLE_NAME: string;
  }
}

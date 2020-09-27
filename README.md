# toggl-task-sync

Synchronise Toggl time entries between two Toggl accounts.

Supports entry creation, modification and deletion with configuration options.

By default the task runs every two hours, but can also be triggered manually with the following request, replacing `{{APP-DOMAIN}}`and `{{API-KEY}}` with correct values.

```
curl --request POST \
  --url {{APP-DOMAIN}}/sync \
  --header 'x-api-key: {{API-KEY}}'
```

Response contains a record of tasks and statuses.

## Configuration

Tool can be configured to support multiple accounts and specific rules for workspaces and/or projects. Entry content can also be overridden if desired.

### API Tokens

Toggl API tokens are fetched from AWS Systems Manager Parameter Store.

API tokens should be saved as a _secure string_ parameter named `toggl-sync-{{ENV}}`, where `{{ENV}}` is the stage that was supplied during deployment. Parameters should be formatted in environment variable format, each parameter divided by newline character (`\n`), where key and value are separated with equals-sign (`=`):

```
ACCOUNT_A = API_TOKEN_FOR_A
ACCOUNT_B = API_TOKEN_FOR_B
```

### Tasks

Tasks define the synchronisations that are run every time the sync-lambda fires. There are controlled in DynamoDB table named `toggl-sync-{{env}}-Tasks`:

| Column Name            | Description                               | Required | Example               |
| ---------------------- | ----------------------------------------- | -------- | --------------------- |
| **sourceApiKeySSMRef** | Name for API token for source account     | `true`   | ACCOUNT_A             |
| **targetApiKeySSMRef** | Name for API token for target account     | `true`   | ACCOUNT_B             |
| **active**             | Is the task active (`1`&nbsp;or&nbsp;`0`) | `true`   | 1                     |
| **label**              | Friendly name for the task (recommended)  | `false`  | WORK&nbsp;-> PERSONAL |

### Entry mapping

By default no entries are synchronised between accounts. These can be controlled in DynamoDB table named `toggl-sync-{{env}}-Mapping`:

| Column Name   | Description                                                  | Required |
| ------------- | ------------------------------------------------------------ | -------- |
| **sourceWid** | Workspace ID to sync entries from                            | `true`   |
| **sourcePid** | Project ID to sync entries from (`*`&nbsp;for&nbsp;wildcard) | `true`   |
| **targetWid** | Workspace ID to sync entries to                              | `true`   |
| **targetPid** | Project ID to sync entries to                                | `false`  |
| **overrides** | Specified overrides for the source entries                   | `false`  |
| **label**     | Friendly name for the mapping                                | `false`  |

Overrides can be given in the following format (note, each one is optional):

```typescript
{
    billable: boolean;
    tags: string[];
    description: string;
}
```

## Limitations

- For safety, new source entries are skipped if target account already contains an entry with same start time and duration and it was not marked as a modified entry
- Synchronisation interval cannot be changed
- Having more than one active deployments can cause uninteded side-effects
- Deletion and modification works only for tasks that were created with this tool

## Development

TODO

## Deployment

TODO

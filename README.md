# toggl-task-sync

[![Actions Status](https://github.com/marinp1/toggl-2-toggl/workflows/Deploy%20to%20AWS/badge.svg)](https://github.com/marinp1/toggl-2-toggl/ad/actions)

Synchronise Toggl time entries between two Toggl accounts.

Supports entry creation, modification and deletion with configuration options.

By default the task runs every two hours, but can also be triggered manually with the following request, replacing `{{APP-DOMAIN}}`and `{{API-KEY}}` with correct values.

```
curl --request POST \
  --url {{APP-DOMAIN}}/sync \
  --header 'x-api-key: {{API-KEY}}'
```

Response contains a record of tasks and statuses.

## Why

I have two Toggl account (work & personal) and I like to avoid writing duplicate entries whenever possible. I however like to spend 100x the time for building an overly complicated tool that automates that process.

At the same time, I wanted to try out the tree-shaking from `serverless-webpack` and wrote the tool to be as tiny as possible. It seemed to work, and at the moment the largest Lambda function's size is only
`12.4 kilobytes`, and the Lambda reads & writes to _DynamoDB_, fetches parameters from _Systems Manager_ and also accesses _Toggl API_.

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

## Development

Local development is bit tricky since the application uses references to AWS Systems Manager, DynamoDB and also fetches / sends information to Toggl API.

Tool uses yarn workspaces and is divided into three parts:

- **api** contains serverless functions
- **service** contains all kind of helpers / internal logic that is used by serverless methods. Why this is it's own folder, don't know, probably shouldn't be.
- **toggl-api** contains a wrapper for Toggl API calls

### Requirements:

- yarn
- Node 12.x

## Deployment

Continuous deployment is enabled on the `master` branch with a Github workflow, targeting production environment.

Workflow also requires Github secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in order to run serverless commands.

Deployment can also be triggered with the following command:

```
npx serverless deploy --stage {{ENV}}
```

## Limitations

- For safety, new source entries are skipped if target account already contains an entry with same start time and duration and it was not marked as a modified entry
- Synchronisation interval cannot be changed
- Having more than one active deployments can cause uninteded side-effects
- Deletion and modification works only for tasks that were created with this tool
- Initial Cloudformation stack must ne created manually
- CI / CD environment is only enabled for prod.

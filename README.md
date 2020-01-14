# toggl-task-sync

![AWS CodeBuild](https://codebuild.eu-central-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoidEprQkNiaDdwQ2x2bWd3blk5K29IVDVQY1ZkaHppWGVFU1ZnZUg1UWZTRmUxMXNqSXNPS2dacXJRSGZuS0U4SVc5WWhZV3Q1QzJxTzcxb1p0R0lGSXhJPSIsIml2UGFyYW1ldGVyU3BlYyI6Ikd2ZFFGRUpwNHBrb1pSTWsiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)

Sync Toggl tasks between two Toggl accounts.

## Configuration
Application parameters are currently fetched from AWS Systems Manager Parameter Store. See `serverless/variables/<stage>.yml` for details.

## Local development
Local development works via serverless offline. Populate `offline.yml` with correct parameters and run `npm run start:offline`.

Requires existing local dynamodb instastructure.

## Deployment

Codebuild deploys project currently automatically from `development` branch.

## Todo
- [ ] Remove some hardcoded strings from application
- [ ] Scripts to generate codebuild infrastructure
- [ ] Local development workflow w/ dynamodb
- [ ] Tests & mock Toggl API
- [ ] Move configuration away from environment variables

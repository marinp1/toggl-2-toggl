#! /bin/bash

npm install -g serverless
npm install --save-dev webpack serverless-webpack serverless-dynamodb-local serverless-offline
serverless deploy --stage $env --package \
./target/$env -v -r eu-central-1

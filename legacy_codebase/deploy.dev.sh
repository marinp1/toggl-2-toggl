#! /bin/bash

npm install -g serverless
serverless deploy --stage dev --package \
./target/dev -v -r eu-central-1

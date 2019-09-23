  
#!/bin/sh

set -e

cd "$(dirname "$0")"

yarn global add jq.node

ACCESS_TOKEN=$(curl --request POST \
  --url https://martincognite.eu.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{"client_id":"'"$PR_CLIENT_ID"'","client_secret":"'"$PR_CLIENT_SECRET"'","audience":"https://pr-server.dev.cognite.ai","grant_type":"client_credentials"}' | jqn 'property("access_token")')


NAME=$CHANGE_ID
REPO=digital-twin-explorer
PUBLIC_URL=/pr/$REPO/$NAME
BUILD_FOLDER=dist
PUBLIC_URL=$PUBLIC_URL yarn build
tar -zcvf $BUILD_FOLDER.tar.gz $BUILD_FOLDER/*

curl https://pr-server.cogniteapp.com/post-pr --header "authorization: bearer $ACCESS_TOKEN" -F "pr=@./$BUILD_FOLDER.tar.gz" -F "name=$NAME" -F "repo=$REPO" -F "folderName=dist"
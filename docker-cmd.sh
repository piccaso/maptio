#! /bin/sh

set -x
set -e

if [ -n "$CLOUDRON_MONGODB_URL" ]; then
    MONGODB_URI="$CLOUDRON_MONGODB_URL"
    export MONGODB_URI
fi

npm run start:docker
#! /bin/sh

set -x
set -e

MONGODB_URI="$CLOUDRON_MONGODB_URL"
export MONGODB_URI
npm run start:docker
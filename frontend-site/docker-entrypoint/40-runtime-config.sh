#!/bin/sh
set -eu

envsubst '${APP_SURFACE} ${APP_BRAND} ${API_BASE_URL} ${PRIMARY_LANDING_URL}' \
  < /usr/share/nginx/html/runtime-config.js.template \
  > /usr/share/nginx/html/runtime-config.js

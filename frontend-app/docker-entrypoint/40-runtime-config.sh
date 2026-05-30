#!/bin/sh
set -eu

TEMPLATE="/usr/share/nginx/html/runtime-config.js.template"
OUTPUT="/usr/share/nginx/html/runtime-config.js"

if [ ! -f "$TEMPLATE" ]; then
  exit 0
fi

: "${APP_SURFACE:=app}"
: "${API_BASE_URL:=https://api.flirto.guru}"
: "${PAY_PUBLIC_BASE_URL:=https://pay.flirto.guru}"
: "${APP_PUBLIC_BASE_URL:=https://app.flirto.guru}"
: "${LANDING_PUBLIC_BASE_URL:=https://lp1.flirto.guru}"

export APP_SURFACE
export API_BASE_URL
export PAY_PUBLIC_BASE_URL
export APP_PUBLIC_BASE_URL
export LANDING_PUBLIC_BASE_URL

envsubst '${APP_SURFACE} ${API_BASE_URL} ${PAY_PUBLIC_BASE_URL} ${APP_PUBLIC_BASE_URL} ${LANDING_PUBLIC_BASE_URL}' < "$TEMPLATE" > "$OUTPUT"

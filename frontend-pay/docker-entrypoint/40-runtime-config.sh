#!/bin/sh
set -eu

TEMPLATE="/usr/share/nginx/html/runtime-config.js.template"
OUTPUT="/usr/share/nginx/html/runtime-config.js"

if [ ! -f "$TEMPLATE" ]; then
  exit 0
fi

: "${APP_SURFACE:=pay}"
: "${API_BASE_URL:=https://api.flirto.guru}"
: "${PAY_PUBLIC_BASE_URL:=https://pay.flirto.guru}"
: "${VITE_YANDEX_METRIKA_ID:=}"
: "${VITE_TRACKING_DEBUG:=false}"

export APP_SURFACE
export API_BASE_URL
export PAY_PUBLIC_BASE_URL
export VITE_YANDEX_METRIKA_ID
export VITE_TRACKING_DEBUG

envsubst '${APP_SURFACE} ${API_BASE_URL} ${PAY_PUBLIC_BASE_URL} ${VITE_YANDEX_METRIKA_ID} ${VITE_TRACKING_DEBUG}' < "$TEMPLATE" > "$OUTPUT"

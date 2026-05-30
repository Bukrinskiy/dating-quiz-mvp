#!/bin/sh
set -eu

TEMPLATE="/usr/share/nginx/html/runtime-config.js.template"
OUTPUT="/usr/share/nginx/html/runtime-config.js"
INDEX_TEMPLATE="/usr/share/nginx/html/index.html.template"
INDEX_OUTPUT="/usr/share/nginx/html/index.html"

if [ ! -f "$TEMPLATE" ]; then
  exit 0
fi

: "${APP_SURFACE:=landing}"
: "${API_BASE_URL:=https://api.flirto.guru}"
: "${PAY_PUBLIC_BASE_URL:=https://pay.flirto.guru}"
: "${VITE_MOBI_SLON_URL:=}"
: "${VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK:=}"
: "${VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE:=}"
: "${VITE_GOOGLE_ADS_ID:=}"
: "${VITE_FB_PIXEL_ID:=}"
: "${VITE_YANDEX_METRIKA_ID:=}"
: "${VITE_TRACKING_DEBUG:=false}"

export APP_SURFACE
export API_BASE_URL
export PAY_PUBLIC_BASE_URL
export VITE_MOBI_SLON_URL
export VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK
export VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE
export VITE_GOOGLE_ADS_ID
export VITE_FB_PIXEL_ID
export VITE_YANDEX_METRIKA_ID
export VITE_TRACKING_DEBUG

envsubst '${APP_SURFACE} ${API_BASE_URL} ${PAY_PUBLIC_BASE_URL} ${VITE_MOBI_SLON_URL} ${VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK} ${VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE} ${VITE_GOOGLE_ADS_ID} ${VITE_FB_PIXEL_ID} ${VITE_YANDEX_METRIKA_ID} ${VITE_TRACKING_DEBUG}' < "$TEMPLATE" > "$OUTPUT"

if [ -f "$INDEX_TEMPLATE" ]; then
  envsubst '${VITE_FB_PIXEL_ID}' < "$INDEX_TEMPLATE" > "$INDEX_OUTPUT"
fi

#!/bin/sh
set -eu

TEMPLATE="/usr/share/nginx/html/runtime-config.js.template"
OUTPUT="/usr/share/nginx/html/runtime-config.js"

if [ ! -f "$TEMPLATE" ]; then
  exit 0
fi

: "${VITE_MOBI_SLON_URL:=https://mobi-slon.com/index.php}"
: "${VITE_MOBI_SLON_CAMPAIGN_KEY:=}"
: "${VITE_FB_PIXEL_ID:=}"
: "${VITE_TRACKING_DEBUG:=false}"

export VITE_MOBI_SLON_URL
export VITE_MOBI_SLON_CAMPAIGN_KEY
export VITE_FB_PIXEL_ID
export VITE_TRACKING_DEBUG

envsubst '${VITE_MOBI_SLON_URL} ${VITE_MOBI_SLON_CAMPAIGN_KEY} ${VITE_FB_PIXEL_ID} ${VITE_TRACKING_DEBUG}' < "$TEMPLATE" > "$OUTPUT"

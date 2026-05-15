#!/bin/bash

START_URL="https://blackmirror-ff202.web.app/sync"

until curl -s --max-time 5 "$START_URL" > /dev/null 2>&1; do
  sleep 2
done

export DISPLAY=:0
xset s off
xset -dpms
xset s noblank

pkill -f chromium 2>/dev/null
rm -f ~/.config/chromium/SingletonLock 2>/dev/null

chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disk-cache-dir=/tmp/cache \
  --disk-cache-size=52428800 \
  --disable-restore-session-state \
  "$START_URL"


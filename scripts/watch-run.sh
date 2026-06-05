#!/usr/bin/env bash
set -euo pipefail

# Install + launch the watch app on a booted Apple Watch simulator.
#
# Detection uses `simctl ... --json` because the old inline `watch:run` grepped
# `simctl list devices booted` for the runtime-identifier string
# "com.apple.CoreSimulator.SimRuntime.watchOS" — which that command never prints
# (its human-readable output shows "-- watchOS 26.5 --"). So on Xcode 16+ it
# always reported "no booted Apple Watch simulator" even when one was running.

WATCH_UDID=$(
  xcrun simctl list devices booted --json 2>/dev/null \
    | python3 -c 'import json, sys
data = json.load(sys.stdin).get("devices", {})
print(next((d["udid"]
            for runtime, devices in data.items() if "watchOS" in runtime
            for d in devices if d.get("state") == "Booted"), ""))'
)

if [ -z "$WATCH_UDID" ]; then
  cat >&2 <<'MSG'
No booted Apple Watch simulator found.

Boot one, then re-run `yarn watch:run`:
  open -a Simulator
  xcrun simctl list devices available | grep "Apple Watch"
  xcrun simctl boot "<Apple Watch UDID>"
MSG
  exit 1
fi

echo "Using booted Apple Watch simulator: $WATCH_UDID"

BUILT_DIR=$(
  xcodebuild -workspace ios/myLoyaltyCards.xcworkspace -scheme watch \
    -configuration Debug -destination "generic/platform=watchOS Simulator" \
    -showBuildSettings 2>/dev/null \
    | awk '/ BUILT_PRODUCTS_DIR =/ {print $3; exit}'
)

if [ -z "${BUILT_DIR:-}" ] || [ ! -d "$BUILT_DIR/watch.app" ]; then
  echo "Could not locate the built watch.app. Run \`yarn watch:build\` first." >&2
  exit 1
fi

open -a Simulator
xcrun simctl install "$WATCH_UDID" "$BUILT_DIR/watch.app"
xcrun simctl launch "$WATCH_UDID" com.iferoporefi.myloyaltycards.watch

echo "✓ Installed + launched the watch app on $WATCH_UDID."
echo "  Add the 'Loyalty Card' complication via the watch face editor or the Smart Stack."

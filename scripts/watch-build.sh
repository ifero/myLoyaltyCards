#!/usr/bin/env bash

set -euo pipefail

build_args=(
  -workspace ios/myLoyaltyCards.xcworkspace
  -scheme watch
  -configuration Debug
  COMPILER_INDEX_STORE_ENABLE=NO
)

if [[ "$(uname -m)" == "arm64" ]]; then
  watch_destination_id="$({
    xcodebuild -workspace ios/myLoyaltyCards.xcworkspace -scheme watch -showdestinations \
      | grep 'platform:watchOS Simulator, arch:arm64' \
      | sed -E 's/.*id:([^,]+),.*/\1/' \
      | head -n 1;
  } || true)"

  if [[ -n "$watch_destination_id" ]]; then
    build_args+=(
      -destination
      "id=$watch_destination_id"
    )
  else
    build_args+=(
      -destination
      "generic/platform=watchOS Simulator"
    )
  fi

  build_args+=(
    ONLY_ACTIVE_ARCH=YES
    EXCLUDED_ARCHS=x86_64
  )
else
  build_args+=(
    -destination
    "generic/platform=watchOS Simulator"
  )
fi

build_args+=(build)

xcodebuild "${build_args[@]}"
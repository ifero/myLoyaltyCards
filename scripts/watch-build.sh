#!/usr/bin/env bash

set -euo pipefail

# Build the watchOS app + complication widget for the simulator.
#
# The xcodebuild selector lives in scripts/lib/watch-xcodebuild.sh — read the
# comments there for why this uses -project/-target rather than the workspace
# scheme. watch-run.sh sources the same file so it resolves BUILT_PRODUCTS_DIR
# from identical args.
source "$(dirname "${BASH_SOURCE[0]}")/lib/watch-xcodebuild.sh"

xcodebuild "${watch_xcodebuild_args[@]}" COMPILER_INDEX_STORE_ENABLE=NO build

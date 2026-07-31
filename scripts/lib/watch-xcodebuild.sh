# Shared xcodebuild selector for the watchOS targets. Sourced (not executed) by
# scripts/watch-build.sh and scripts/watch-run.sh so the build and the install
# can never disagree about where watch.app lands — see the SYMROOT note below
# for why that is a real hazard rather than a theoretical one.
#
# Callers must run from the repo root; the project path is relative.
#
# --- Why -project/-target and not -workspace/-scheme -------------------------
# No shared `watch` scheme exists (only myLoyaltyCards.xcscheme is in
# xcshareddata), so xcodebuild autocreates one — and autocreation adds the
# container app. That pulled the whole iOS Pod tree (Sentry, ZXingObjC, libwebp,
# SDWebImage, RNSVG, RNReanimated, …) into a watch-only build: ~19 minutes on CI
# to reach targets that compile in seconds. The real target graph runs the other
# way round (myLoyaltyCards → watch → watchwidget) and the watch targets declare
# no pods of their own (there is no targets/*/pods.rb), so going through the
# workspace buys nothing here.
#
# If a targets/*/pods.rb ever appears, these targets gain CocoaPods dependencies
# and this must go back through the workspace.
#
# --- Why -sdk watchsimulator is load-bearing ---------------------------------
# In -target mode xcodebuild otherwise defaults to the iOS SDK and fails the
# watch targets on provisioning ("No profiles for '…watch.widget' were found").
# Not to be confused with -sdk iphonesimulator on the *app* build, which breaks
# the watch widget.
#
# --- Where the products land -------------------------------------------------
# -target mode ignores DerivedData and defaults SYMROOT to $SRCROOT/build, so
# products go to ios/build/Debug-watchsimulator (gitignored via ios/.gitignore)
# rather than ~/Library/Developer/Xcode/DerivedData/…. Anything locating
# watch.app must therefore ask xcodebuild with *these* args — hence this file.
watch_xcodebuild_args=(
  -project ios/myLoyaltyCards.xcodeproj
  -target watch
  -configuration Debug
  -sdk watchsimulator
)

if [[ "$(uname -m)" == "arm64" ]]; then
  # -target mode takes no -destination, so ONLY_ACTIVE_ARCH has no active arch to
  # resolve against and xcodebuild builds every slice in ARCHS (arm64 + x86_64)
  # even while -showBuildSettings reports ONLY_ACTIVE_ARCH = YES. Setting
  # ONLY_ACTIVE_ARCH=YES therefore does nothing; excluding the slice outright is
  # what actually thins the build (measured: 16s fat vs 14s thin).
  #
  # This replaces the old -showdestinations probe, which had to load the whole
  # workspace just to find a concrete arm64 destination id for the scheme build.
  watch_xcodebuild_args+=(EXCLUDED_ARCHS=x86_64)
fi

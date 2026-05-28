#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FASTLANE_DIR="$ROOT_DIR/fastlane"
APPFILE="$FASTLANE_DIR/Appfile"
REQUIRED_RUBY_VERSION="4.0.5"
RUBY_VERSION_HINT="4.0.5"
BUNDLER_VERSION="2.7.2"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/fastlane-match.sh bootstrap
  ./scripts/fastlane-match.sh fetch
  ./scripts/fastlane-match.sh sync development [--readonly] [--force]
  ./scripts/fastlane-match.sh sync adhoc [--readonly] [--force]
  ./scripts/fastlane-match.sh sync appstore [--readonly] [--force]
  ./scripts/fastlane-match.sh nuke development|distribution|enterprise [--skip-confirmation]
  ./scripts/fastlane-match.sh change-password
  ./scripts/fastlane-match.sh import [fastlane match import args...]
  ./scripts/fastlane-match.sh help

Examples:
  yarn fastlane:match:bootstrap
  yarn fastlane:match:fetch
  yarn fastlane:match:development -- --readonly
  yarn fastlane:match -- sync adhoc --force
EOF
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

is_compatible_ruby() {
  "$1" -e 'required = Gem::Version.new(ARGV[0]); current = Gem::Version.new(RUBY_VERSION); exit(current == required ? 0 : 1)' "$REQUIRED_RUBY_VERSION"
}

prefer_compatible_homebrew_ruby() {
  candidates=(
    "/opt/homebrew/opt/ruby/bin/ruby"
    "/usr/local/opt/ruby/bin/ruby"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]] && is_compatible_ruby "$candidate"; then
      export PATH="$(dirname "$candidate"):$PATH"
      return 0
    fi
  done

  return 1
}

require_ruby() {
  if ! command -v ruby >/dev/null 2>&1; then
    prefer_compatible_homebrew_ruby || fail "Ruby is not installed. Install Ruby ${RUBY_VERSION_HINT} and retry."
  fi

  if ! is_compatible_ruby "$(command -v ruby)"; then
    prefer_compatible_homebrew_ruby || true
  fi

  if ! is_compatible_ruby "$(command -v ruby)"; then
    current_version="$(ruby -e 'print RUBY_VERSION')"
    fail "Ruby ${REQUIRED_RUBY_VERSION} is required for Fastlane. Current Ruby is ${current_version}. Install Ruby ${RUBY_VERSION_HINT} with Homebrew or your preferred version manager and retry."
  fi
}

setup_gem_path() {
  gem_user_bin="$(ruby -e 'require "rubygems"; print Gem.user_dir')/bin"
  export PATH="$gem_user_bin:$PATH"
}

ensure_bundler() {
  if ! gem list bundler -i -v "$BUNDLER_VERSION" >/dev/null 2>&1; then
    gem install bundler -v "$BUNDLER_VERSION" --no-document
  fi
}

bundle_cmd() {
  bundle "_${BUNDLER_VERSION}_" "$@"
}

ensure_bundle_install() {
  if ! (cd "$ROOT_DIR" && bundle_cmd check >/dev/null 2>&1); then
    (cd "$ROOT_DIR" && bundle_cmd install)
  fi
}

read_app_identifiers() {
  [[ -f "$APPFILE" ]] || fail "Missing $APPFILE"

  app_identifier="$({ sed -nE 's/^app_identifier\("([^"]+)"\)$/\1/p' "$APPFILE" | head -n 1; } || true)"
  [[ -n "$app_identifier" ]] || fail "Could not read app_identifier from $APPFILE"

  watch_identifier="${app_identifier}.watch"
  bundle_identifiers="${app_identifier},${watch_identifier}"
}

run_fastlane() {
  require_ruby
  setup_gem_path
  ensure_bundler
  ensure_bundle_install
  (cd "$ROOT_DIR" && bundle_cmd exec fastlane "$@")
}

handle_bootstrap() {
  require_ruby
  setup_gem_path
  ensure_bundler
  ensure_bundle_install
  echo "Ruby: $(ruby -e 'print RUBY_VERSION')"
  echo "Bundler: $(bundle_cmd --version)"
}

handle_fetch() {
  run_fastlane ios fetch_certificates
}

handle_sync() {
  profile_type="${1:-}"
  shift || true

  case "$profile_type" in
    development|adhoc|appstore)
      ;;
    *)
      fail "sync requires one of: development, adhoc, appstore"
      ;;
  esac

  read_app_identifiers
  args=(match "$profile_type" -a "$bundle_identifiers")

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --readonly|--force|--verbose|--force-for-new-devices|--skip-provisioning-profiles)
        args+=("$1")
        ;;
      *)
        fail "Unsupported sync option: $1"
        ;;
    esac
    shift
  done

  run_fastlane "${args[@]}"
}

handle_nuke() {
  target="${1:-}"
  shift || true

  case "$target" in
    development|distribution|enterprise)
      ;;
    *)
      fail "nuke requires one of: development, distribution, enterprise"
      ;;
  esac

  read_app_identifiers
  args=(match nuke "$target" -a "$bundle_identifiers")

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-confirmation|--readonly|--verbose|--safe-remove-certs)
        args+=("$1")
        ;;
      *)
        fail "Unsupported nuke option: $1"
        ;;
    esac
    shift
  done

  run_fastlane "${args[@]}"
}

command_name="${1:-help}"
shift || true

case "$command_name" in
  bootstrap)
    handle_bootstrap
    ;;
  fetch)
    handle_fetch "$@"
    ;;
  sync)
    handle_sync "$@"
    ;;
  nuke)
    handle_nuke "$@"
    ;;
  change-password)
    run_fastlane match change_password "$@"
    ;;
  import)
    run_fastlane match import "$@"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    fail "Unknown command: $command_name"
    ;;
esac
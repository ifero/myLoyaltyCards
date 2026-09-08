#!/usr/bin/env ruby
#
# Tests for the release-critical helper methods in `fastlane/Fastfile`.
#
# WHY THIS FILE EXISTS. On 2026-09-05/06/07 three consecutive nightly builds shipped the phone AAB
# to Play `internal` and then died on `Track not found: wear:qa` — three silent phone-only releases
# with unrecoverable version codes. The cause was a hardcoded table of "well-known" Wear track names
# transcribed from developers.google.com/android-publisher/tracks, which contradicts the Play API:
# this listing has `wear:internal`, not `wear:qa`. The fix replaced that table with
# `ensure_wear_track_exists!`, which validates the destination against Play's LIVE track list.
#
# That fix then had TWO ways to silently no-op, and neither would have failed a build — see
# `TestAvailablePlayTracksIsLive` below, which is the single most important class in this file.
# Everything else here is cheap insurance; that one is the regression that matters.
#
# HOW IT WORKS. The helpers are plain `def`s inside `platform :android do`, so they can be sliced
# out of the Fastfile as text and `class_eval`-ed into a throwaway class with collaborators stubbed.
# No fastlane boot, no Play credentials, no network for anything but the deliberate liveness probe.
#
# HOW TO RUN.  yarn test:fastlane          -> bundle exec ruby fastlane/Fastfile.test.rb
#
# Verified green against BOTH fastlane 2.232.2 and 2.235.0 (the lockfile's version, and therefore
# CI's), so nothing here depends on a single gem release.
#
# ⚠️ `minitest` MUST stay in the Gemfile. It is a *bundled* gem in Ruby 4.0, not a default one, so
# plain `ruby` finds it but `bundle exec ruby` does not unless the Gemfile declares it — and this
# repo runs all Ruby through bundler because `.bundle/config` sets `BUNDLE_PATH: ./bundler`, which
# keeps the bundled gems out of the system GEM_HOME entirely.
#
# ⚠️ In a fresh git worktree you must run `bundle install` once, or `bundle exec` fails with a
# missing-gems error that looks like a version conflict and is not — `./bundler` is per-checkout and
# gitignored. `require "fastlane_core"` then activates the fastlane gem, which puts every one of its
# sub-libraries (including `supply/lib`) on the load path; no $LOAD_PATH manipulation is needed.
#
# HOW THIS SUITE WAS VALIDATED. Five mutations were reintroduced into a scratch copy of the Fastfile
# and all five were caught: dropping the explicit `require "supply"`; reading `Supply.config`
# directly again; re-deriving `wear:qa` for `internal`; making the preflight an early `return`; and
# making a nil track list block the release. A guard suite that cannot fail is the exact bug it is
# here to prevent, so re-run that exercise if you materially restructure these tests.

require "minitest/autorun"

# Ruby 4.0 emits "literal string will be frozen in the future" for a lot of the fastlane gem's own
# code, which buries real output. Filter only warnings raised FROM the gem — anything originating in
# this repo still prints, so we do not blind ourselves to our own deprecations.
module Warning
  FASTLANE_GEM_DIR = begin
    Gem::Specification.find_by_name("fastlane").gem_dir
  rescue Gem::MissingSpecError
    nil
  end

  def self.warn(message, category: nil)
    return if FASTLANE_GEM_DIR && message.to_s.start_with?(FASTLANE_GEM_DIR)

    super
  end
end

require "fastlane_core"

# ---------------------------------------------------------------------------------------------
# Slicing the Fastfile
# ---------------------------------------------------------------------------------------------

module Fastfile
  PATH = File.expand_path("Fastfile", __dir__)

  # ⚠️ MUST be read as UTF-8 explicitly. Without LANG/LC_ALL set, Ruby's `default_external` is
  # US-ASCII, and the Fastfile's ⚠️/⛔/— characters then make `class_eval` fail with
  # `invalid multibyte character 0xE2` — which reads like a syntax error in the code under test
  # and is not. CI runners and local shells differ on this, so never rely on the default.
  SOURCE = File.read(PATH, encoding: "UTF-8")

  # Extract one helper by name.
  #
  # The helpers sit at TWO-SPACE indentation inside `platform :android do`, so the first line that
  # is exactly `  end` terminates the method — every `end` belonging to an inner `if`/`begin`/block
  # is indented deeper. That is the whole trick, and it is checked rather than assumed: the slice is
  # parsed before it is returned, so re-indenting or renaming a helper fails loudly HERE with a
  # clear message instead of surfacing as a confusing NoMethodError inside a test.
  def self.helper(name)
    start = SOURCE.index(/^  def #{Regexp.escape(name)}[(\n]/)
    raise "No `def #{name}` at two-space indent in #{PATH} — was it renamed or re-indented?" if start.nil?

    lines = []
    SOURCE[start..].each_line do |line|
      lines << line
      break if line == "  end\n"
    end
    source = lines.join

    unless lines.last == "  end\n"
      raise "Slice for `#{name}` ran to end-of-file without a `  end` terminator."
    end
    unless parses?(source)
      raise "Slice for `#{name}` is not syntactically complete Ruby. Indentation assumption broken?"
    end

    source
  end

  def self.parses?(source)
    RubyVM::AbstractSyntaxTree.parse("class SyntaxProbe\n#{source}\nend")
    true
  rescue SyntaxError
    false
  end
end

# The tracks this Play listing actually has, read live from the Publishing API on 2026-09-07 and
# reproduced identically in all three failed nightly runs (33951247712, 34018414507, 34095184450).
#
# ⛔ `wear:qa` is NOT here, despite Google's own documentation specifying `qa` as the internal
# testing track name. The API is authoritative. Do not "correct" this fixture.
REAL_TRACKS = %w[
  alpha beta internal production
  wear:alpha wear:beta wear:internal wear:production
].freeze

# Any non-empty pair is enough for the pure-logic tests; only the liveness probe cares that these
# are not real credentials (it asserts on HOW they fail).
CREDS = { package_name: "com.example.app", json_key_data: '{"type":"service_account"}' }.freeze

# ---------------------------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------------------------

# `UI` is nested inside each harness rather than defined at top level: `class_eval` with a string
# sets the cref to the class, so the sliced code resolves `UI` here first. That keeps the stub from
# depending on whether anything else in the process has defined a global `UI`.
module StubUI
  def self.included(base)
    base.const_set(:UI, Module.new do
      def self.messages = (@messages ||= [])
      def self.reset! = (@messages = [])
      def self.user_error!(message) = raise(FastlaneUserError, message)
      def self.important(message) = messages << message
      def self.error(message) = messages << message
      def self.message(message) = messages << message
    end)
  end
end

# Stands in for fastlane's `UI.user_error!`, which raises `FastlaneCore::Interface::FastlaneError`.
# Only the raising behaviour matters to these tests.
class FastlaneUserError < StandardError; end

# Harness A — the decision logic, with `available_play_tracks` stubbed so no network is touched.
class TrackResolution
  include StubUI
  WEAR_TRACK_PREFIX = "wear".freeze

  attr_accessor :stub_tracks

  def initialize(stub_tracks) = (@stub_tracks = stub_tracks)

  # Signature must mirror the real helper so a change to it breaks these tests loudly.
  def available_play_tracks(package_name: nil, json_key_data: nil) = @stub_tracks

  class_eval(Fastfile.helper("wear_play_track"))
  class_eval(Fastfile.helper("ensure_wear_track_exists!"))
  class_eval(Fastfile.helper("wear_band_for"))
end

# Harness B — the REAL `available_play_tracks`, unstubbed, for the liveness regression.
class RealTrackLookup
  include StubUI
  WEAR_TRACK_PREFIX = "wear".freeze

  class_eval(Fastfile.helper("available_play_tracks"))
end

# Shared ENV/global hygiene. `WEAR_PLAY_TRACK` and `Supply.config` are both process-global, and
# minitest randomises test order, so every test must start from a known state.
module CleanGlobals
  def setup
    @saved_track = ENV.fetch("WEAR_PLAY_TRACK", nil)
    ENV.delete("WEAR_PLAY_TRACK")
    Supply.config = nil if defined?(Supply)
  end

  def teardown
    @saved_track.nil? ? ENV.delete("WEAR_PLAY_TRACK") : ENV["WEAR_PLAY_TRACK"] = @saved_track
    Supply.config = nil if defined?(Supply)
  end
end

# ---------------------------------------------------------------------------------------------
# wear_band_for — feeds the versionCode band scheme
# ---------------------------------------------------------------------------------------------

class TestWearBandFor < Minitest::Test
  include CleanGlobals

  def setup
    super
    @lane = TrackResolution.new(REAL_TRACKS)
  end

  # This keys on the PHONE track, not the Wear track name, which is why the 2026-09-07 track-name
  # correction did not have to touch the bands. Locking it down so that stays true.
  def test_production_maps_to_the_production_band
    assert_equal "production", @lane.wear_band_for("production")
  end

  def test_internal_maps_to_the_nightly_band
    assert_equal "nightly", @lane.wear_band_for("internal")
  end

  def test_everything_else_falls_back_to_beta
    assert_equal "beta", @lane.wear_band_for("alpha")
    assert_equal "beta", @lane.wear_band_for("beta")
    assert_equal "beta", @lane.wear_band_for("some-future-closed-track")
  end
end

# ---------------------------------------------------------------------------------------------
# wear_play_track — derivation and override
# ---------------------------------------------------------------------------------------------

class TestWearPlayTrack < Minitest::Test
  include CleanGlobals

  def setup
    super
    @lane = TrackResolution.new(REAL_TRACKS)
  end

  # The correction of 2026-09-07: `internal` derives `wear:internal`, and that track exists.
  # The Fastfile previously hardcoded `internal => wear:qa` and refused to run without it.
  def test_internal_derives_wear_internal_not_wear_qa
    assert_equal "wear:internal", @lane.wear_play_track("internal")
    refute_equal "wear:qa", @lane.wear_play_track("internal")
  end

  def test_every_phone_track_derives_its_real_wear_counterpart
    %w[internal alpha beta production].each do |phone|
      derived = @lane.wear_play_track(phone)
      assert_equal "wear:#{phone}", derived
      assert_includes REAL_TRACKS, derived, "#{derived} must be a track this listing really has"
    end
  end

  # The override seam is retained for a hand-created CLOSED track, whose custom name pairs with no
  # phone track at all. It must win outright over the derivation.
  def test_env_override_takes_precedence
    ENV["WEAR_PLAY_TRACK"] = "wear:qa-eu"
    assert_equal "wear:qa-eu", @lane.wear_play_track("alpha")
  end

  def test_blank_and_whitespace_override_is_ignored
    ENV["WEAR_PLAY_TRACK"] = "   "
    assert_equal "wear:internal", @lane.wear_play_track("internal")

    ENV["WEAR_PLAY_TRACK"] = ""
    assert_equal "wear:internal", @lane.wear_play_track("internal")
  end

  def test_override_is_stripped
    ENV["WEAR_PLAY_TRACK"] = "  wear:beta  "
    assert_equal "wear:beta", @lane.wear_play_track("internal")
  end
end

# ---------------------------------------------------------------------------------------------
# ensure_wear_track_exists! — the preflight
# ---------------------------------------------------------------------------------------------

class TestEnsureWearTrackExists < Minitest::Test
  include CleanGlobals

  def preflight(lane, phone_track) = lane.ensure_wear_track_exists!(phone_track, **CREDS)

  def test_passes_for_every_lane_against_the_real_inventory
    lane = TrackResolution.new(REAL_TRACKS)
    %w[internal alpha beta production].each do |phone|
      preflight(lane, phone) # must not raise
    end
  end

  # THE OUTAGE, as a test. `WEAR_PLAY_TRACK=wear:qa` is exactly what nightly-builds.yml pinned for
  # three nights. It must now fail in the preflight — before either artifact is built, and therefore
  # before the phone AAB can be committed on its own.
  def test_rejects_the_wear_qa_override_that_caused_the_outage
    ENV["WEAR_PLAY_TRACK"] = "wear:qa"
    lane = TrackResolution.new(REAL_TRACKS)

    error = assert_raises(FastlaneUserError) { preflight(lane, "internal") }
    assert_match(/wear:qa.*DOES NOT EXIST/m, error.message)
  end

  def test_failure_message_lists_the_tracks_that_do_exist
    ENV["WEAR_PLAY_TRACK"] = "wear:qa"
    error = assert_raises(FastlaneUserError) { preflight(TrackResolution.new(REAL_TRACKS), "internal") }

    # The whole point of asking Play instead of consulting a table: the answer travels with the
    # failure, so the next person does not have to guess or re-read a stale doc.
    REAL_TRACKS.each { |track| assert_includes error.message, "  - #{track}" }
  end

  def test_advises_the_console_opt_in_when_no_wear_track_exists_at_all
    lane = TrackResolution.new(%w[alpha beta internal production])

    error = assert_raises(FastlaneUserError) { preflight(lane, "internal") }
    assert_includes error.message, "Use a dedicated release track for Wear OS"
  end

  # The two failure modes must not be confused: a missing form factor needs a Console click, a wrong
  # name needs a different `WEAR_PLAY_TRACK`. Telling someone to enable a form factor that is already
  # enabled sends them to the wrong place entirely.
  def test_does_not_blame_the_form_factor_when_wear_tracks_do_exist
    ENV["WEAR_PLAY_TRACK"] = "wear:qa"
    error = assert_raises(FastlaneUserError) { preflight(TrackResolution.new(REAL_TRACKS), "internal") }

    refute_includes error.message, "never been enabled"
    assert_includes error.message, "WEAR_PLAY_TRACK"
  end

  # A transient Play outage must not block a release that would otherwise succeed. The upload stays
  # the authoritative check, so an unverifiable destination is a warning and not a stop.
  def test_unavailable_track_list_does_not_block_the_release
    lane = TrackResolution.new(nil)
    preflight(lane, "internal") # must not raise

    assert_match(/Could not verify/, lane.class::UI.messages.join(" "))
  end

  def test_hand_named_closed_track_passes_when_it_really_exists
    ENV["WEAR_PLAY_TRACK"] = "wear:qa-eu"
    lane = TrackResolution.new(REAL_TRACKS + ["wear:qa-eu"])
    preflight(lane, "alpha") # must not raise
  end
end

# ---------------------------------------------------------------------------------------------
# available_play_tracks — THE REGRESSION THAT MATTERS
# ---------------------------------------------------------------------------------------------

# `available_play_tracks` ends in `rescue StandardError => e ... nil`. That is correct for its
# original job (a diagnostic must never replace the failure it is explaining) but it means ANY
# breakage inside it degrades to `nil` — and `ensure_wear_track_exists!` treats `nil` as
# "cannot verify, carry on". So a broken lookup does not fail a build; it silently disarms the
# guard while every log line still looks healthy.
#
# Two real traps were found this way, both fixed, neither detectable from CI output:
#
#   1. `Supply.config` is a bare `attr_accessor` (supply/lib/supply.rb) that stays nil until the
#      `supply` action assigns it (upload_to_play_store.rb:31). Reading `Supply.config[:package_name]`
#      in a PREFLIGHT therefore raised NoMethodError on nil.
#   2. `require "supply"` sits INSIDE `UploadToPlayStoreAction.run` (:5-6), so the `Supply` constant
#      does not exist before an upload has run at all — NameError.
#
# These tests assert the lookup gets PAST both and fails for a legitimate reason (no credentials).
# That distinction — a live guard versus a decorative one — is what they exist to protect.
class TestAvailablePlayTracksIsLive < Minitest::Test
  include CleanGlobals

  def setup
    super
    @lookup = RealTrackLookup.new
    RealTrackLookup::UI.reset!
  end

  def diagnostic = RealTrackLookup::UI.messages.join(" | ")

  # nil when `Supply` has not been loaded yet, which is indistinguishable from an unset config for
  # the purposes of these tests.
  def supply_config = defined?(Supply) ? Supply.config : nil

  def test_gets_past_require_supply_with_no_upload_having_run
    @lookup.available_play_tracks(**CREDS)

    refute_match(/uninitialized constant/, diagnostic,
                 "`Supply` was not loaded — restore the explicit `require \"supply\"`.")
  end

  def test_builds_its_own_config_when_supply_config_is_nil
    # Order-independent precondition. `Supply` may legitimately be UNDEFINED here — minitest
    # randomises order, so whether an earlier test has already triggered the lookup's own
    # `require "supply"` varies run to run. Both states are what a preflight looks like; what must
    # never be true is a *populated* config, which would mean an upload had already configured it.
    #
    # ⛔ Do NOT "fix" this by requiring supply at the top of the file: that would permanently define
    # `Supply` and silently disable `test_gets_past_require_supply_with_no_upload_having_run`.
    assert_nil supply_config, "precondition: Supply.config must be nil/absent in a preflight"

    @lookup.available_play_tracks(**CREDS)

    refute_match(/for nil/, diagnostic,
                 "Crashed on a nil Supply.config — restore the FastlaneCore::Configuration fallback.")
    refute_match(/NoMethodError/, diagnostic)
  end

  # The positive half: having cleared both traps, the call must reach Google's auth layer. Offline
  # and with a stub service-account that has no `client_email`, that is where it stops. Any OTHER
  # failure means it never got that far.
  def test_reaches_the_auth_layer_which_proves_the_lookup_is_real
    @lookup.available_play_tracks(**CREDS)

    assert_match(/client_email|credential|auth|Signet|private key|OpenSSL|JSON|getaddrinfo|resolve/i,
                 diagnostic,
                 "Expected an auth/network failure, got: #{diagnostic.inspect}")
  end

  def test_returns_nil_rather_than_raising_when_it_cannot_tell
    # Never propagate: as a diagnostic it must not replace the real error, and as a preflight a
    # transient outage must not fail the release.
    assert_nil @lookup.available_play_tracks(**CREDS)
  end

  def test_returns_nil_when_credentials_are_absent
    assert_nil @lookup.available_play_tracks(package_name: nil, json_key_data: nil)
    assert_nil @lookup.available_play_tracks(package_name: "com.example.app", json_key_data: "  ")
  end

  # Guards the comment's claim that assigning `Supply.config` here is safe: the `supply` action
  # overwrites it unconditionally, so a preflight cannot poison a later upload.
  def test_supply_action_assigns_config_unconditionally
    action = File.join(
      Gem::Specification.find_by_name("fastlane").gem_dir,
      "fastlane/lib/fastlane/actions/upload_to_play_store.rb"
    )
    skip "fastlane gem layout changed" unless File.exist?(action)

    assert_match(/^\s*Supply\.config = params/, File.read(action, encoding: "UTF-8"),
                 "supply no longer overwrites Supply.config — re-check the preflight's assignment.")
  end
end

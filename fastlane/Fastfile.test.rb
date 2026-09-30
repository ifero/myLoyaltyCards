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
# HOW IT WORKS. The helpers are plain `def`s inside a `platform` block, so they can be sliced out of
# the Fastfile as text and `class_eval`-ed into a throwaway class with collaborators stubbed. Lanes
# are sliced the same way: most are only read, and `ship_ios!` is also run, against recording stubs.
# No fastlane boot, no Play or App Store Connect credentials, no network for anything but the
# deliberate liveness probe.
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
# making a nil track list block the release. The iOS tests (Story 21.7) were checked the same way
# against twenty-seven more, from scoping the build-number lookup to one version to adding a fourth
# lane that uploads on its own; that story's record lists each one and the test that catches it. A
# guard suite that cannot fail is the exact bug it is here to prevent, so re-run that exercise if
# you materially restructure these tests.

require "minitest/autorun"
require "ripper"

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
  # The helpers sit at TWO-SPACE indentation inside a `platform` block, so the first line that
  # is exactly `  end` terminates the method — every `end` belonging to an inner `if`/`begin`/block
  # is indented deeper. That is the whole trick, and it is checked rather than assumed: the slice is
  # parsed before it is returned, so re-indenting or renaming a helper fails loudly HERE with a
  # clear message instead of surfacing as a confusing NoMethodError inside a test.
  def self.helper(name)
    start = SOURCE.index(/^  def #{Regexp.escape(name)}[(\n]/)
    raise "No `def #{name}` at two-space indent in #{PATH} — was it renamed or re-indented?" if start.nil?

    terminated_slice(SOURCE[start..], name)
  end

  # The whole `platform :<name> do` block, which runs to the first line that is exactly `end`.
  #
  # There must be exactly ONE: fastlane merges repeated `platform` blocks, so a lane in a second
  # block would be real and invisible to every slice taken from the first. Checked, not assumed, in
  # every one-line opener spelling (`platform(:ios) do`, indented, a trailing comment) — and fail
  # closed, so a `platform` line this cannot read, such as a quoted `:"ios"` or a split-line
  # `platform(`, fails the suite instead of hiding a block.
  def self.platform(name)
    unreadable = SOURCE.lines.grep(/^[ \t]*platform\b(?![ \t]*=[^=])/)
                       .grep_v(/^[ \t]*platform[ \t]*\(?[ \t]*:\w+\b/)
    raise "Unreadable `platform` line in #{PATH}: #{unreadable.first.strip}" if unreadable.any?

    opener = /^[ \t]*platform[ \t]*\(?[ \t]*:#{name}\b[^\n]*\n/
    count = SOURCE.scan(opener).size
    raise "Expected one `platform :#{name} do` block in #{PATH}, found #{count}." unless count == 1

    block_start = SOURCE.index(opener)

    block = +""
    SOURCE[block_start..].each_line do |line|
      block << line
      break if line == "end\n"
    end
    block
  end

  # Extract one lane, from ONE platform's block.
  #
  # Lane names repeat across platforms — `beta`, `nightly` and `upload_release` each exist for iOS
  # AND Android — so the search is confined to that platform's block. Inside it a lane sits at the
  # same two-space indent as a helper and closes on the same `  end`, so it is sliced and
  # parse-checked the same way.
  def self.lane(platform_name, name)
    block = platform(platform_name)
    start = block.index(/^  (?:private_)?lane :#{Regexp.escape(name)} do\b/)
    raise "No two-space `lane :#{name}` in the #{platform_name} block — renamed?" if start.nil?

    terminated_slice(block[start..], name)
  end

  def self.terminated_slice(source, name)
    lines = []
    source.each_line do |line|
      lines << line
      break if line == "  end\n"
    end
    slice = lines.join

    unless lines.last == "  end\n"
      raise "Slice for `#{name}` ran to end-of-file without a `  end` terminator."
    end
    unless parses?(slice)
      raise "Slice for `#{name}` is not syntactically complete Ruby. Indentation assumption broken?"
    end

    slice
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

# ---------------------------------------------------------------------------------------------
# iOS build numbering — one rule for every App Store Connect upload (Story 21.7)
# ---------------------------------------------------------------------------------------------

# Harness C — `next_ios_build_number`, with the App Store Connect lookup stubbed.
class IosBuildNumbering
  attr_reader :lookups

  def initialize(latest_upload)
    @latest_upload = latest_upload
    @lookups = []
  end

  # Stands in for the fastlane ACTION the helper calls, which `FastFile#method_missing` dispatches
  # at runtime. Every lookup is recorded, so a test can assert what was ASKED, not only the answer.
  def latest_testflight_build_number(**options)
    @lookups << options
    @latest_upload
  end

  class_eval(Fastfile.helper("next_ios_build_number"))
end

class TestNextIosBuildNumber < Minitest::Test
  API_KEY = { key_id: "stub" }.freeze

  def test_numbers_one_past_the_latest_upload
    lane = IosBuildNumbering.new(39)

    assert_equal 40, lane.next_ios_build_number(app_identifier: "com.example.app", api_key: API_KEY)
  end

  # The design this pins: ONE app-wide sequence. Apple's TN2420 scopes the check to one release
  # train on iOS and to the whole app on macOS, and an app-wide lookup satisfies both, where
  # `version:` would satisfy iOS alone and `live:` would read the build on sale, below every later
  # upload. So the lookup is exactly the app and the key, with nothing narrowing it.
  def test_asks_about_every_version_of_the_app
    lane = IosBuildNumbering.new(39)
    lane.next_ios_build_number(app_identifier: "com.example.app", api_key: API_KEY)

    assert_equal [{ app_identifier: "com.example.app", api_key: API_KEY }], lane.lookups,
                 "The build-number lookup must span every version of the app — see the Fastfile."
  end

  # Guards the Fastfile comment's claim that the lookup returns the MOST RECENT upload, not the
  # highest-numbered one — the reason every iOS upload must be numbered by this one rule.
  def test_lookup_is_by_upload_date
    action = File.join(
      Gem::Specification.find_by_name("fastlane").gem_dir,
      "fastlane/lib/fastlane/actions/app_store_build_number.rb"
    )
    skip "fastlane gem layout changed" unless File.exist?(action)

    assert_match(/sort: "-uploadedDate"/, File.read(action, encoding: "UTF-8"),
                 "fastlane changed how it picks the latest build — re-check next_ios_build_number.")
  end
end

# Harness D — the real `ship_ios!` body, RUN against recording stubs.
#
# The lane is sliced like a helper and evaluated here, where `private_lane` turns its block into a
# method, so what runs is the Fastfile's own body rather than a paraphrase of it. Every action it
# calls records its name and options; an action it calls that is not stubbed fails the test.
# `app_identifier` stands in for the Fastfile local the real block closes over.
class IosShipping
  include StubUI
  API_KEY = { key_id: "stub" }.freeze

  def self.private_lane(name, &body)
    define_method(name) { |options| instance_exec(options, &body) }
  end

  attr_reader :calls

  def initialize(latest_upload)
    @latest_upload = latest_upload
    @calls = []
  end

  def app_identifier = "com.example.app"

  def app_store_connect_api_key(**options) = record(:app_store_connect_api_key, options, API_KEY)
  def apply_distribution_signing(**options) = record(:apply_distribution_signing, options, {})
  def latest_testflight_build_number(**options)
    record(:latest_testflight_build_number, options, @latest_upload)
  end

  def increment_build_number(**options) = record(:increment_build_number, options)
  def build_app(**options) = record(:build_app, options)
  def upload_to_app_store(**options) = record(:upload_to_app_store, options)
  def upload_to_testflight(**options) = record(:upload_to_testflight, options)

  def record(name, options, result = nil)
    @calls << [name, options]
    result
  end

  class_eval(Fastfile.helper("next_ios_build_number"))
  class_eval(Fastfile.lane(:ios, "ship_ios!"))
end

class TestShipIos < Minitest::Test
  UPLOADS = %i[upload_to_app_store upload_to_testflight].freeze
  NUMBERING = %i[latest_testflight_build_number increment_build_number build_app].freeze

  def ship(**options)
    lane = IosShipping.new(40)
    lane.ship_ios!(**options)
    lane
  end

  def uploads(lane) = lane.calls.select { |name, _| UPLOADS.include?(name) }

  def test_numbers_the_build_from_the_lookup_before_building_it
    lane = ship(upload: true, destination: :testflight)

    assert_equal NUMBERING, lane.calls.map(&:first) & NUMBERING
    assert_equal({ app_identifier: "com.example.app", api_key: IosShipping::API_KEY },
                 lane.calls.assoc(:latest_testflight_build_number).last,
                 "The lookup must ask about this app, with the lane's own API key.")
    assert_equal "41", lane.calls.assoc(:increment_build_number).last[:build_number]
  end

  # The release lane's destination, with its options pinned whole: the listing is a console task
  # (Story 21.5 AC7) and there is no `fastlane/metadata/`, so the upload carries only the binary.
  def test_the_app_store_destination_uploads_only_to_the_app_store
    expected = { api_key: IosShipping::API_KEY, skip_metadata: true, skip_screenshots: true,
                 precheck_include_in_app_purchases: false }

    assert_equal [[:upload_to_app_store, expected]],
                 uploads(ship(upload: true, destination: :app_store))
  end

  def test_the_testflight_destination_uploads_only_to_testflight
    assert_equal [[:upload_to_testflight, { api_key: IosShipping::API_KEY }]],
                 uploads(ship(upload: true, destination: :testflight))
  end

  def test_a_dry_run_builds_and_uploads_nothing
    lane = ship(upload: false, destination: :testflight)

    assert_includes lane.calls.map(&:first), :build_app
    assert_empty uploads(lane)
  end

  def test_an_unknown_destination_fails_before_anything_runs
    lane = IosShipping.new(40)

    assert_raises(FastlaneUserError) { lane.ship_ios!(upload: true, destination: :appstore) }
    assert_empty lane.calls,
                 "A bad destination must fail before the ~20-minute build, not after it."
  end
end

class TestIosUploadLanesShareOneBody < Minitest::Test
  # Every lane that uploads to App Store Connect, and the one call it may make.
  CALLS = {
    "beta" => "ship_ios!(upload: true, destination: :testflight)",
    "nightly" => "ship_ios!(upload: !options[:dry_run], destination: :testflight)",
    "upload_release" => "ship_ios!(upload: true, destination: :app_store)"
  }.freeze

  # What only the shared body may do.
  BODY_ACTIONS = /\b(?:increment_build_number|build_app|upload_to_testflight|upload_to_app_store)\b/

  # Every App Store Connect BUILD upload or build-number action, under every name fastlane gives it.
  ASC_ACTIONS = %w[upload_to_testflight pilot testflight upload_to_app_store deliver appstore
                   latest_testflight_build_number app_store_build_number].freeze
  LAYOUT_TOKENS = %i[on_sp on_nl on_ignored_nl].freeze

  # Full-line comments are stripped so prose ABOUT an action can never read as a call to it.
  def code(name) = Fastfile.lane(:ios, name).lines.grep_v(/^\s*#/).join

  # The methods among `names` that `source` CALLS, as Ruby's own lexer sees them. A symbol
  # (`:testflight`), a string (`"appstore"`), a `%i[]` entry or a comment that spells one is not a
  # call, so the aliases need no special case.
  def calls(source, names)
    tokens = Ripper.lex(source).reject { |(_, type, _)| LAYOUT_TOKENS.include?(type) }
    [[nil, nil, nil], *tokens].each_cons(2).filter_map do |(_, before, _), (_, type, word)|
      word if type == :on_ident && names.include?(word) && before != :on_symbeg
    end
  end

  # The defect this pins: `upload_release` was a second copy of the build body, and that copy
  # drifted — it numbered builds from its own workflow's run counter. A lane picks a destination
  # and whether to upload; the one body, run above, does everything else.
  def test_each_upload_lane_only_picks_a_destination
    CALLS.each do |name, call|
      lane = code(name)

      assert_equal [call], lane.lines.map(&:strip).grep(/\bship_ios!/),
                   "`#{name}` must make exactly one call, `#{call}`."
      refute_match(BODY_ACTIONS, lane,
                   "`#{name}` has its own build body again — that belongs in `ship_ios!`.")
    end
  end

  # The same defect, from a lane nobody has written yet. Nothing in `platform :ios` outside the
  # shared body and its numbering may upload to App Store Connect or read its build number, under
  # any of the actions' names. `adhoc` and `build_dev` still build, and may: neither uploads. The
  # scan covers every iOS lane in this Fastfile only because `Fastfile.platform` refuses a second
  # (or unreadable) `platform` opener, and the assertions below refuse a `lane` defined outside
  # every platform block and any `override_lane`, which replaces a lane's body where no slice sees.
  def test_nothing_else_in_the_ios_block_uploads_to_app_store_connect
    rest = Fastfile.platform(:ios)
                   .sub(Fastfile.lane(:ios, "ship_ios!"), "")
                   .sub(Fastfile.helper("next_ios_build_number"), "")

    assert_empty calls(rest, ASC_ACTIONS),
                 "An iOS upload outside `ship_ios!` would number its builds by some other rule."
    outside = Fastfile::SOURCE.gsub(/^[ \t]*platform\b.*?^end\n/m, "")
    assert_empty outside.scan(/^[ \t]*(?:private_)?lane\b[^\n]*/),
                 "A lane outside every `platform` block would escape this scan."
    assert_empty calls(Fastfile::SOURCE, %w[override_lane]),
                 "`override_lane` replaces a lane's body where no slice can see it."
  end
end

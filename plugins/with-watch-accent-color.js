/**
 * Name `AccentColor` as the global accent of both watchOS targets (Story 21.3).
 *
 * WHY THIS EXISTS AT ALL
 *
 * Filling `AccentColor.colorset` is necessary and NOT sufficient, which is the
 * one thing the story could not know without building. Measured on a 46 mm
 * watchOS 26.4 simulator:
 *
 *   - with the colorset filled and nothing else, `assetutil --info` shows the
 *     colour IS in the compiled `Assets.car` (`AccentColor`, srgb,
 *     0.988/0.800/0.047 = #FCCC0C) — so the catalogue half works;
 *   - but `Color.accentColor` still renders flat grey `#808080`, because
 *     `actool` only writes `NSAccentColorName` into the built `Info.plist` when
 *     `ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME` names a colorset, and
 *     that build setting is absent from every target `expo prebuild` generates.
 *
 * ⚠️ Both this story and `cardi-watch-grammar.md` §4.5 say the un-named accent
 * resolves to "system default blue". It does not — it is `#808080`. The fix is
 * the same either way, but the symptom described is wrong, so do not use blue
 * as the before-state when checking this.
 *
 * WHY NOT `colors: { $accent }` IN `expo-target.config.js`
 *
 * `@bacons/apple-targets` does support that, and it DOES land the build setting
 * (verified). It is rejected for one reason: `withIosColorset` hardcodes
 * `"color-space": "display-p3"`, and display-p3 components of 0.988/0.800/0.047
 * are a visibly more saturated yellow than sRGB `#FCCC0C` on the P3 display
 * every modern Apple Watch has. The design system says beam "appears at exactly
 * that value or not at all", so the colorset stays hand-authored in sRGB and
 * only the *naming* is automated here.
 *
 * ⚠️ ORDERING: THIS PLUGIN MUST BE LISTED **BEFORE** `@bacons/apple-targets`
 * IN `app.json`.
 *
 * That reads backwards and is not a typo. Expo's `withMod` wraps the previously
 * registered mod and calls it *after* its own action, so within one mod chain
 * the LAST-registered plugin runs FIRST. The watch targets do not exist until
 * `@bacons/apple-targets` creates them, so this has to run after it — which
 * means being registered before it. `with-watch-accent-color.test.js` pins that
 * order, because getting it wrong produces no error at all: the target filter
 * simply matches nothing.
 */
const { withXcodeProjectBeta } = require('@bacons/apple-targets/build/with-bacons-xcode');
const { PBXNativeTarget } = require('@bacons/xcode');

/** The colorset both watch asset catalogues carry. */
const ACCENT_COLORSET_NAME = 'AccentColor';

/** The build setting `actool` turns into `Info.plist`'s `NSAccentColorName`. */
const BUILD_SETTING = 'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME';

/**
 * Every watchOS target, selected by SDK rather than by name.
 *
 * `SDKROOT` is `watchos` for the watch app AND for the watch-widget extension,
 * and is not that for the phone app — so this picks up both catalogues that own
 * an `AccentColor.colorset` and nothing else. Matching on the target NAME would
 * break the moment `expo.name` changes, which it did once already (Story 21.1).
 */
/**
 * The build configurations of `target` that this plugin can actually write to.
 *
 * Optional all the way down on purpose. Everything Xcode and `@bacons/apple-targets`
 * produce has a configuration list, and every configuration a real `.pbxproj` serialises
 * carries a `buildSettings` dictionary — possibly empty — but a hand-edited or half-written
 * project need not, and a raw `Cannot read properties of undefined` thrown from inside a
 * filter would replace the explicit, actionable error below with a stack trace.
 *
 * ⚠️ **It filters on `buildSettings` rather than tolerating its absence, and that is what
 * keeps the two call sites honest.** Selection and mutation both go through here, so
 * "a configuration this plugin can act on" has exactly one definition: a target whose
 * configurations are all unusable cannot be selected, which means it falls through to the
 * loud error instead of being silently half-applied.
 */
const buildConfigurationsOf = (target) =>
  (target.props?.buildConfigurationList?.props?.buildConfigurations ?? []).filter(
    (config) => config.props?.buildSettings
  );

const watchOSTargets = (project) =>
  (project.rootObject?.props?.targets ?? []).filter(
    (target) =>
      PBXNativeTarget.is(target) &&
      buildConfigurationsOf(target).some(
        (config) => config.props?.buildSettings?.SDKROOT === 'watchos'
      )
  );

const withWatchAccentColor = (config) =>
  withXcodeProjectBeta(config, async (props) => {
    const targets = watchOSTargets(props.modResults);

    // Fail loudly rather than shipping a silent no-op. If the mod ordering above
    // ever regresses, or a target stops declaring `SDKROOT = watchos`, the accent
    // quietly reverts to grey and every gate in this repo stays green — so the
    // absence of a match is an error, not a skip.
    if (targets.length === 0) {
      throw new Error(
        `${BUILD_SETTING}: no watchOS target found to apply the accent colour to. ` +
          'Check that ./plugins/with-watch-accent-color is listed BEFORE ' +
          '@bacons/apple-targets in app.json — it has to run after the targets exist.'
      );
    }

    for (const target of targets) {
      // Every configuration, not just Debug. A Release-only omission would ship a
      // correct-looking simulator build and a grey App Store one.
      for (const buildConfig of buildConfigurationsOf(target)) {
        buildConfig.props.buildSettings[BUILD_SETTING] = ACCENT_COLORSET_NAME;
      }
    }

    return props;
  });

module.exports = withWatchAccentColor;
module.exports.ACCENT_COLORSET_NAME = ACCENT_COLORSET_NAME;
module.exports.BUILD_SETTING = BUILD_SETTING;
module.exports.watchOSTargets = watchOSTargets;

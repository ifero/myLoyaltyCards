/**
 * `with-watch-accent-color` — the selector and the failure mode (Story 21.3).
 *
 * Two things are worth pinning here, and neither is the happy path.
 *
 * **The selector is `SDKROOT === 'watchos'`, not a target name.** Naming targets was the
 * obvious alternative and it is a trap: `expo.name` already changed once (Story 21.1
 * moved the whole project from `myLoyaltyCards` to `Cardi`), and the watch targets are
 * named from it. A rename would have silently stopped matching.
 *
 * **Matching nothing is an ERROR, not a skip.** This plugin has to run after
 * `@bacons/apple-targets` has created the watch targets, which — because Expo's `withMod`
 * runs the last-registered mod first — means being registered BEFORE it in `app.json`.
 * Get that backwards and the plugin runs against a project with no watch targets at all.
 * Nothing else in the repo would notice: prebuild succeeds, the build succeeds, every
 * gate is green, and `Color.accentColor` quietly reverts to grey on the watch. So the
 * empty match throws. `test/watch-accent.test.ts` guards the ordering itself.
 *
 * `.test.js` rather than `.test.ts` on purpose: the subject is CommonJS, outside the
 * TypeScript project, and a `.test.ts` here would be typechecked against Node globals the
 * repo does not declare (the same reason `scripts/*.test.js` are `.js`).
 */

/** Captures the mod action the plugin registers, so it can be invoked directly. */
let registeredAction;

// ⚠️ NEITHER MOCK IS `virtual`, and that is the point. `withXcodeProjectBeta` lives at a
// DEEP, UNDOCUMENTED path inside a dependency pinned by a caret range and with no `exports`
// map guarding it, so a routine `yarn upgrade` could move or rename it. A virtual mock would
// never resolve the real module, and this suite would stay green while `expo prebuild`
// started failing. Resolving for real makes a dependency bump fail here, in a one-second
// Node test, instead of in the native workflow.
jest.mock('@bacons/apple-targets/build/with-bacons-xcode', () => ({
  withXcodeProjectBeta: (config, action) => {
    registeredAction = action;
    return config;
  }
}));

jest.mock('@bacons/xcode', () => ({
  // The real `PBXNativeTarget.is` is a prototype check; the fixtures below carry an
  // explicit flag so a non-native entry (a PBXAggregateTarget, say) can be represented.
  PBXNativeTarget: { is: (target) => target.isNativeTarget === true }
}));

const withWatchAccentColor = require('./with-watch-accent-color');
const { watchOSTargets, BUILD_SETTING, ACCENT_COLORSET_NAME } = withWatchAccentColor;

/** A native target whose Debug/Release configurations both declare `sdkroot`. */
const nativeTarget = (name, sdkroot) => ({
  name,
  isNativeTarget: true,
  props: {
    buildConfigurationList: {
      props: {
        buildConfigurations: [
          { name: 'Debug', props: { buildSettings: { SDKROOT: sdkroot } } },
          { name: 'Release', props: { buildSettings: { SDKROOT: sdkroot } } }
        ]
      }
    }
  }
});

const project = (...targets) => ({ rootObject: { props: { targets } } });

const settingsOf = (target) =>
  target.props.buildConfigurationList.props.buildConfigurations.map(
    (config) => config.props.buildSettings[BUILD_SETTING]
  );

describe('withWatchAccentColor', () => {
  describe('the third-party surface it reaches into', () => {
    it('still exposes `withXcodeProjectBeta` at the path the plugin requires', () => {
      // The mocks above replace this module's BEHAVIOUR; this asserts its EXISTENCE and
      // shape, which they deliberately do not. `@bacons/apple-targets` is a caret range, so
      // the plugin's one unsupported assumption — that an internal build file keeps its path
      // and its named export — is the thing most likely to break on an upgrade, and the
      // symptom would otherwise be a prebuild failure rather than a test failure.
      const resolved = jest.requireActual('@bacons/apple-targets/build/with-bacons-xcode');
      expect(typeof resolved.withXcodeProjectBeta).toBe('function');
      expect(typeof jest.requireActual('@bacons/xcode').PBXNativeTarget.is).toBe('function');
    });
  });

  describe('target selection', () => {
    it('picks every watchOS target — the app AND the widget extension', () => {
      // Both catalogues own an `AccentColor.colorset`, so both need naming. They are
      // distinguishable only by product type, and share `SDKROOT = watchos`.
      const watchApp = nativeTarget('watch', 'watchos');
      const watchWidget = nativeTarget('watchwidget', 'watchos');
      const selected = watchOSTargets(
        project(watchApp, watchWidget, nativeTarget('Cardi', 'iphoneos'))
      );
      expect(selected).toEqual([watchApp, watchWidget]);
    });

    it('leaves the phone app alone', () => {
      const phone = nativeTarget('Cardi', 'iphoneos');
      expect(watchOSTargets(project(phone))).toEqual([]);
    });

    it('ignores non-native targets', () => {
      const aggregate = { ...nativeTarget('Pods', 'watchos'), isNativeTarget: false };
      expect(watchOSTargets(project(aggregate))).toEqual([]);
    });

    it('does not throw on a target with no configuration list at all', () => {
      // Nothing Xcode or apple-targets produces looks like this, but a hand-edited project
      // could — and a raw `Cannot read properties of undefined` from inside the filter
      // would replace the plugin's explicit, actionable error with a stack trace.
      const malformed = { isNativeTarget: true, props: {} };
      expect(() => watchOSTargets(project(malformed))).not.toThrow();
      expect(watchOSTargets(project(malformed))).toEqual([]);
    });

    it('treats a configuration with no buildSettings as one it cannot act on', () => {
      // Selection and mutation share `buildConfigurationsOf`, so "a configuration this
      // plugin can write to" has ONE definition. A target whose configurations are all
      // unusable therefore fails the loud check below rather than being selected and then
      // silently half-applied — which is the failure this plugin exists to prevent.
      const hollow = {
        isNativeTarget: true,
        props: {
          buildConfigurationList: { props: { buildConfigurations: [{ name: 'Debug', props: {} }] } }
        }
      };
      expect(watchOSTargets(project(hollow))).toEqual([]);
    });
  });

  describe('applying the build setting', () => {
    it('names the accent colorset on every configuration of every watchOS target', async () => {
      // Every configuration, not just Debug: a Release-only omission would ship a
      // correct-looking simulator build and a grey App Store one.
      const watchApp = nativeTarget('watch', 'watchos');
      const watchWidget = nativeTarget('watchwidget', 'watchos');
      const phone = nativeTarget('Cardi', 'iphoneos');

      withWatchAccentColor({});
      await registeredAction({ modResults: project(watchApp, watchWidget, phone) });

      expect(settingsOf(watchApp)).toEqual([ACCENT_COLORSET_NAME, ACCENT_COLORSET_NAME]);
      expect(settingsOf(watchWidget)).toEqual([ACCENT_COLORSET_NAME, ACCENT_COLORSET_NAME]);
      expect(settingsOf(phone)).toEqual([undefined, undefined]);
    });

    it('writes to a selected target whose SIBLING configuration is unusable', async () => {
      // The case the `buildConfigurationsOf` filter exists for, driven through the real mod
      // action rather than through the selector alone. A target is SELECTED on any ONE
      // configuration declaring `SDKROOT = watchos`, so the loop can still meet a sibling
      // the filter rejected — and before the filter, that sibling threw a raw TypeError.
      // Now it is simply not written to, and the usable configuration still is.
      const mixed = {
        isNativeTarget: true,
        props: {
          buildConfigurationList: {
            props: {
              buildConfigurations: [
                { name: 'Debug', props: { buildSettings: { SDKROOT: 'watchos' } } },
                { name: 'Release', props: {} }
              ]
            }
          }
        }
      };

      withWatchAccentColor({});
      await expect(registeredAction({ modResults: project(mixed) })).resolves.toBeDefined();

      const [debug, release] = mixed.props.buildConfigurationList.props.buildConfigurations;
      expect(debug.props.buildSettings[BUILD_SETTING]).toBe(ACCENT_COLORSET_NAME);
      expect(release.props.buildSettings).toBeUndefined();
    });

    it('throws when no watchOS target matched, rather than quietly doing nothing', async () => {
      withWatchAccentColor({});
      await expect(
        registeredAction({ modResults: project(nativeTarget('Cardi', 'iphoneos')) })
      ).rejects.toThrow(/no watchOS target found/);
    });

    it('names the ordering requirement in the error, because that is the likely cause', async () => {
      withWatchAccentColor({});
      await expect(registeredAction({ modResults: project() })).rejects.toThrow(
        /BEFORE[\s\S]*@bacons\/apple-targets/
      );
    });
  });
});

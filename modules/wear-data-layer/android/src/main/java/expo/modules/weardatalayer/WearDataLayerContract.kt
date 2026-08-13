package expo.modules.weardatalayer

/**
 * Transport-level constants shared by this module and the Wear OS APK.
 *
 * The mirror lives in
 * `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/sync/WearSyncContract.kt`,
 * and the TypeScript mirror in `core/wear-connectivity.ts`. The three are duplicated rather
 * than shared because the phone app, the Wear APK and the JS bundle have no build system in
 * common — the same reason `watch-android` re-declares the brand catalogue instead of importing
 * it. `core/wear-connectivity.test.ts` asserts the TS side against these literals so a rename on
 * one side cannot land silently.
 *
 * Only paths and envelope keys belong here. Nothing in this module knows what a loyalty card is
 * (AC1: "keep it a thin transport — no business logic, no card knowledge").
 */
internal object WearDataLayerContract {
  /**
   * Every path this app owns starts here. The listener service's intent filter is scoped to this
   * prefix so an unrelated Data Layer path on the same node never starts our process.
   */
  const val PATH_PREFIX = "/myloyaltycards"

  /** `DataMap` key carrying the JSON snapshot body. */
  const val KEY_PAYLOAD = "payload"

  /**
   * `DataMap` key carrying the envelope version. Mirrors the `version` field on the phone's
   * versioned `WatchMessage`s so an older reader can recognise — and ignore — a newer envelope
   * instead of misreading it (AC11).
   */
  const val KEY_VERSION = "version"

  /** Current envelope version. */
  const val PROTOCOL_VERSION = 1
}

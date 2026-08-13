package com.iferoporefi.myloyaltycards.wear.sync

import kotlinx.coroutines.flow.Flow

/**
 * The watch's view of the Wearable Data Layer, reduced to the four operations this app needs.
 *
 * An interface rather than direct Play services calls, for one reason that matters more than
 * tidiness: `DataClient`, `MessageClient` and `CapabilityClient` are final classes returned by
 * static factories, so code that touches them directly cannot be exercised on the JVM. Behind
 * this seam, the snapshot decode, the full-replace apply and — most importantly — the durable
 * outbox all run as plain `testDebugUnitTest` cases in CI, with no emulator. The story calls the
 * outbox "the highest-risk component and the least testable in a unit test"; this is what makes
 * it testable.
 *
 * Everything here is opaque JSON. The transport knows nothing about loyalty cards.
 */
internal interface WearSyncTransport {
    /**
     * Read the snapshot DataItem that is already present on this node, or `null` if there is
     * none.
     *
     * **This is AC4 and it is not optional.** A DataItem written while the watch app was not
     * running is *not* re-delivered as a change event when the app starts — the Data Layer
     * reports changes, not state. Subscribing alone would leave a freshly installed watch
     * showing an empty list until the phone happened to publish again. It is the same lesson
     * `WatchSessionManager.swift:39-41` records for iOS's cached `applicationContext`.
     */
    suspend fun readSnapshot(): String?

    /** Snapshot bodies as they arrive while the app is running (AC3). */
    fun snapshots(): Flow<String>

    /**
     * Whether the phone app is currently reachable, emitted on change.
     *
     * Backed by the capability the phone advertises ([WearSyncContract.PHONE_CAPABILITY]) rather
     * than by raw node connectivity: a node can be connected while the companion app is absent,
     * and sending to it would fail in a way indistinguishable from being offline.
     */
    fun phoneReachable(): Flow<Boolean>

    /** Send one JSON message to the phone. `false` if no node accepted it. */
    suspend fun sendMessage(json: String): Boolean
}

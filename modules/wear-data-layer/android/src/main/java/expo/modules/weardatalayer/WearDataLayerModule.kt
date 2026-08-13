package expo.modules.weardatalayer

import android.content.Context
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.TimeUnit

/**
 * Phone-side Wearable Data Layer transport (Story 10-6, AC1).
 *
 * A **thin transport with no card knowledge**: it moves opaque JSON strings between the phone
 * and a paired Wear OS device. Everything that understands a loyalty card — payload shape,
 * sanitisation, size budget, `CARD_USED` semantics — lives in `core/wear-connectivity.ts`, which
 * is inside the repository's 80 % coverage gate. Nothing in `modules/` is coverage-measured, so
 * keeping logic out of here is a testability decision as much as a layering one.
 *
 * Transport mapping (see the story's "Mapping WatchConnectivity onto the Data Layer"):
 * - the card snapshot is a **DataItem** — persistent, last-write-wins per path, the true analogue
 *   of iOS's `applicationContext`;
 * - `requestCards` and `CARD_USED` are **messages** — fire-and-forget, correct for a ping and for
 *   an event whose durability is provided by the sender's own outbox.
 *
 * Every Play services call is awaited with an explicit [TASK_TIMEOUT_SECONDS] bound. Story 16-10
 * is the precedent: an unguarded `await` with no timeout hung the phone's cold start forever when
 * the network never settled. A watch is disconnected far more often than a phone, so an
 * unbounded await here would be the same bug on a flakier transport.
 */
class WearDataLayerModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("WearDataLayer")

    Events(EVENT_INBOUND_MESSAGE)

    /**
     * Whether this device can talk to a wearable at all — i.e. Google Play services is present
     * and usable. Android's Data Layer guide requires this check before any Data Layer call;
     * without it, a device without Play services throws instead of degrading.
     */
    AsyncFunction("isSupported") {
      GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) ==
        ConnectionResult.SUCCESS
    }

    /** Number of currently connected wearable nodes. Zero means "nothing is listening". */
    AsyncFunction("getConnectedNodeCount") {
      awaitTask(Wearable.getNodeClient(context).connectedNodes).size
    }

    /**
     * Publishes [json] as the DataItem at [path], replacing whatever was there.
     *
     * `setUrgent()` is deliberate: without it the Data Layer may defer delivery by up to
     * 30 minutes, and the project's watch-sync rule is "no throttling, immediate sync on
     * changes" (`docs/project-context.md`). A card added on the phone must appear on the watch
     * now, not eventually (AC3).
     *
     * Note the Data Layer is content-addressed: re-publishing a byte-identical DataItem does not
     * raise a change event on a node that already holds it. That is correct and is why the watch
     * performs a mandatory read on start-up (AC4) rather than relying on change events alone.
     */
    AsyncFunction("publishSnapshot") { path: String, json: String ->
      val request = PutDataMapRequest.create(path)
        .apply {
          dataMap.putInt(WearDataLayerContract.KEY_VERSION, WearDataLayerContract.PROTOCOL_VERSION)
          dataMap.putString(WearDataLayerContract.KEY_PAYLOAD, json)
        }
        .asPutDataRequest()
        .setUrgent()

      awaitTask(Wearable.getDataClient(context).putDataItem(request))
      true
    }

    /**
     * Sends [json] to every connected node at [path]. Returns how many nodes accepted it.
     *
     * A per-node failure is counted as "not delivered" rather than failing the whole call: one
     * unreachable watch must not stop a reachable one from being told. The caller decides what a
     * zero return means.
     */
    AsyncFunction("sendMessage") { path: String, json: String ->
      val nodes = awaitTask(Wearable.getNodeClient(context).connectedNodes)
      val messageClient = Wearable.getMessageClient(context)
      val body = json.toByteArray(Charsets.UTF_8)

      nodes.count { node ->
        runCatching { awaitTask(messageClient.sendMessage(node.id, path, body)) }.isSuccess
      }
    }

    /**
     * Every watch → phone message retained since the last acknowledgement, oldest first.
     *
     * Non-destructive by design — see [WearDataLayerInbox]. The caller applies the batch, commits,
     * then calls `acknowledgeInboundMessages`. Re-delivery of an unacknowledged batch is safe
     * because the phone's `applyWatchUsageEvents` dedups on `"<cardId>:<usedAt>"`.
     */
    AsyncFunction("readInboundMessages") {
      WearDataLayerInbox.read(context).map { entry ->
        mapOf("id" to entry.id, "path" to entry.path, "data" to entry.data)
      }
    }

    /** Drops the acknowledged messages from the durable inbox. Returns how many were removed. */
    AsyncFunction("acknowledgeInboundMessages") { ids: List<String> ->
      WearDataLayerInbox.acknowledge(context, ids)
    }

    OnStartObserving {
      WearDataLayerInboundBridge.setListener {
        sendEvent(EVENT_INBOUND_MESSAGE, emptyMap<String, Any>())
      }
    }

    OnStopObserving {
      WearDataLayerInboundBridge.setListener(null)
    }

    OnDestroy {
      WearDataLayerInboundBridge.setListener(null)
    }
  }

  private val context: Context
    get() = appContext.reactContext
      ?: throw MissingReactContextException()

  /**
   * Blocks the (background) AsyncFunction thread until [task] settles or [TASK_TIMEOUT_SECONDS]
   * elapses. `AsyncFunction` bodies are dispatched off the JavaScript thread, so blocking here
   * cannot stall the UI; the timeout is what stops a never-settling Play services call from
   * pinning that worker forever.
   */
  private fun <T> awaitTask(task: Task<T>): T =
    Tasks.await(task, TASK_TIMEOUT_SECONDS, TimeUnit.SECONDS)

  private companion object {
    /**
     * The event name JavaScript subscribes to. Carries no payload on purpose: it is a "there is
     * something in the inbox" nudge, and the inbox — not the event — is the source of truth.
     */
    const val EVENT_INBOUND_MESSAGE = "onInboundMessage"

    /**
     * Ten seconds is generously above a healthy Bluetooth round trip and well below any user's
     * patience for a stuck operation.
     */
    const val TASK_TIMEOUT_SECONDS = 10L
  }
}

/**
 * Raised when the module is invoked with no React context — the app is tearing down. Surfaces to
 * JavaScript as a rejected promise the caller can log, rather than an opaque crash.
 */
internal class MissingReactContextException :
  CodedException("React context is unavailable; the Wearable Data Layer cannot be reached")

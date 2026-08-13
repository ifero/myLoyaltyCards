package expo.modules.weardatalayer

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/**
 * The single inbound path for watch → phone Data Layer messages (Story 10-6, AC1).
 *
 * Declared in this module's `AndroidManifest.xml`, which the manifest merger folds into the
 * app manifest `expo prebuild` generates. Play services starts the app's process to dispatch
 * here, so a message arrives whether or not React Native is running — which is the point:
 * the watch flushes its `CARD_USED` outbox on reconnection, not when the phone app happens to
 * be open.
 *
 * The service does exactly two things and knows nothing about loyalty cards:
 *
 * 1. persists the raw body to [WearDataLayerInbox] so it survives until JavaScript can apply it;
 * 2. nudges a live module instance, if one exists, so a foreground app reacts immediately
 *    instead of waiting for its next poll.
 *
 * There is deliberately **no** live `MessageClient.addListener` anywhere in this module. A live
 * listener would fire *in addition* to this service while the app is running, delivering every
 * foreground message twice. One path in, one dedup point.
 *
 * Callbacks run on a background thread (guaranteed by `WearableListenerService`), so the
 * synchronous `commit()` inside the inbox is safe here.
 */
class WearDataLayerListenerService : WearableListenerService() {

  override fun onMessageReceived(messageEvent: MessageEvent) {
    val path = messageEvent.path
    // The intent filter already scopes delivery to this prefix; re-checking costs nothing and
    // keeps the invariant true if the filter is ever widened.
    if (!path.startsWith(WearDataLayerContract.PATH_PREFIX)) {
      return
    }

    val body = String(messageEvent.data, Charsets.UTF_8)
    WearDataLayerInbox.append(applicationContext, path, body)
    WearDataLayerInboundBridge.notifyInboundMessage()
  }
}

/**
 * Process-wide hand-off from [WearDataLayerListenerService] (which can run with no JavaScript
 * alive) to a live [WearDataLayerModule] (which can only exist while JavaScript is running).
 *
 * The listener is a plain nullable reference rather than a collection because a process hosts at
 * most one React Native instance of this module. If a second one ever registers, the later
 * registration wins and the earlier module simply stops receiving nudges — it loses nothing,
 * because [WearDataLayerInbox] is the source of truth and every consumer reads the same store.
 */
internal object WearDataLayerInboundBridge {
  @Volatile
  private var listener: (() -> Unit)? = null

  fun setListener(newListener: (() -> Unit)?) {
    listener = newListener
  }

  /**
   * Signals that a message was appended to the inbox. Exceptions are swallowed: this runs on the
   * Data Layer's dispatch thread, and a failure to notify must never prevent the message from
   * having been persisted — the inbox write already happened, so the event is safe either way.
   */
  fun notifyInboundMessage() {
    val current = listener ?: return
    runCatching { current() }
  }
}

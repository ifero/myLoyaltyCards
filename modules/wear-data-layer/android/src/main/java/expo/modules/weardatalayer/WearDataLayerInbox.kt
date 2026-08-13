package expo.modules.weardatalayer

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Durable, bounded store for watch → phone messages that arrive while JavaScript is not running
 * (Story 10-6, AC9).
 *
 * ### Why this exists
 *
 * The watch deletes a `CARD_USED` event from its own outbox as soon as `sendMessage` reports
 * success. If the phone's React Native host is dead at that moment — the common case, since the
 * watch flushes when connectivity returns, not when the user happens to be holding their phone —
 * the message reaches [WearDataLayerListenerService] and there is no JS to hand it to. Persisting
 * here is what makes "events are never lost" true rather than aspirational.
 *
 * ### Read-then-acknowledge, not drain
 *
 * [read] does **not** remove anything. The consumer applies the messages, commits its own
 * transaction, and only then calls [acknowledge]. A drain-on-read would open a window where a
 * process death between the native read and the JS database write loses the batch — the same
 * "delete only after a confirmed handoff" rule the watch-side outbox follows.
 *
 * Re-delivery after an unacknowledged read is therefore possible and expected. That is safe: the
 * phone's `applyWatchUsageEvents` dedups on `"<cardId>:<usedAt>"` (Story 9.6), so applying a
 * message twice is a no-op.
 *
 * ### Durability and concurrency
 *
 * Writes use `commit()` rather than `apply()`: the listener service can be torn down the
 * instant it returns, and `apply()`'s background flush is not guaranteed to have run by then.
 * All mutations hold [lock] so the read-modify-write of the JSON array is atomic within the
 * process. `SharedPreferences` is not multi-process safe, but the listener service runs in the
 * app's own process (no `android:process` attribute), so a single lock is sufficient.
 */
internal object WearDataLayerInbox {
  private const val PREFS_NAME = "expo.modules.weardatalayer.inbox"
  private const val KEY_MESSAGES = "messages"
  private const val KEY_NEXT_ID = "nextId"

  private const val FIELD_ID = "id"
  private const val FIELD_PATH = "path"
  private const val FIELD_DATA = "data"

  /**
   * Hard ceiling on retained messages. A watch that has been offline for days flushes its whole
   * outbox at once, and an unbounded store here would be a slow memory leak backed by a
   * `SharedPreferences` XML file that is re-parsed on every append. Beyond the limit the OLDEST
   * entries are dropped: the newest usage events are the ones that still matter for
   * `lastUsedAt`, and `usageCount` degrades by an undercount rather than the store degrading
   * into unbounded growth. 500 is far above any realistic backlog (it is 500 card opens between
   * two launches of the phone app).
   */
  const val MAX_ENTRIES = 500

  private val lock = Any()

  /** One retained message. [data] is the raw UTF-8 body exactly as it came off the wire. */
  data class Entry(val id: String, val path: String, val data: String)

  /**
   * Appends one message. Returns the number of entries retained afterwards, so the caller can
   * tell when the [MAX_ENTRIES] ceiling started dropping history.
   */
  fun append(context: Context, path: String, data: String): Int = synchronized(lock) {
    val prefs = prefs(context)
    val entries = readArray(prefs)
    val nextId = prefs.getLong(KEY_NEXT_ID, 1L)

    entries.put(
      JSONObject()
        .put(FIELD_ID, nextId.toString())
        .put(FIELD_PATH, path)
        .put(FIELD_DATA, data),
    )

    val trimmed = trimToLimit(entries)
    prefs
      .edit()
      .putString(KEY_MESSAGES, trimmed.toString())
      .putLong(KEY_NEXT_ID, nextId + 1L)
      .commit()

    trimmed.length()
  }

  /** Every retained message, oldest first. Non-destructive — see the class docs. */
  fun read(context: Context): List<Entry> = synchronized(lock) {
    val entries = readArray(prefs(context))
    buildList(entries.length()) {
      for (index in 0 until entries.length()) {
        val entry = entries.optJSONObject(index) ?: continue
        val id = entry.optString(FIELD_ID)
        val path = entry.optString(FIELD_PATH)
        // A malformed row is skipped, never allowed to abort the batch (AC11). It is still
        // removed by `acknowledge` below, so it cannot wedge the inbox permanently.
        if (id.isEmpty() || path.isEmpty()) continue
        add(Entry(id = id, path = path, data = entry.optString(FIELD_DATA)))
      }
    }
  }

  /** Removes the entries whose ids are in [ids]. Returns how many were removed. */
  fun acknowledge(context: Context, ids: Collection<String>): Int = synchronized(lock) {
    if (ids.isEmpty()) return 0

    val prefs = prefs(context)
    val entries = readArray(prefs)
    val acknowledged = ids.toSet()
    val retained = JSONArray()
    var removed = 0

    for (index in 0 until entries.length()) {
      val entry = entries.optJSONObject(index)
      // A row that failed to parse carries no id, so it can never be acknowledged by one.
      // Dropping it here is what keeps a corrupt write from blocking the queue forever.
      if (entry == null) {
        removed += 1
        continue
      }

      val id = entry.optString(FIELD_ID)
      // Same reasoning for a structurally-valid row with a blank id or path: `read` skips it, so
      // no consumer can ever name it in an acknowledgement, and without this it would linger
      // until the MAX_ENTRIES trim happened to evict it. `append` never writes such a row, so
      // this only fires on an externally corrupted store — but "unreachable by both paths" is
      // not a state worth leaving reachable.
      if (id.isEmpty() || entry.optString(FIELD_PATH).isEmpty()) {
        removed += 1
        continue
      }

      if (id in acknowledged) {
        removed += 1
      } else {
        retained.put(entry)
      }
    }

    if (removed > 0) {
      prefs.edit().putString(KEY_MESSAGES, retained.toString()).commit()
    }
    removed
  }

  /** Test/maintenance helper: empties the store. */
  fun clear(context: Context) = synchronized(lock) {
    prefs(context).edit().remove(KEY_MESSAGES).commit()
    Unit
  }

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun readArray(prefs: SharedPreferences): JSONArray {
    val raw = prefs.getString(KEY_MESSAGES, null) ?: return JSONArray()
    return try {
      JSONArray(raw)
    } catch (_: org.json.JSONException) {
      // Unparseable store: start over rather than throw on every subsequent append. Losing an
      // already-corrupt backlog is strictly better than a transport that can never recover.
      JSONArray()
    }
  }

  private fun trimToLimit(entries: JSONArray): JSONArray {
    if (entries.length() <= MAX_ENTRIES) return entries
    val trimmed = JSONArray()
    for (index in entries.length() - MAX_ENTRIES until entries.length()) {
      trimmed.put(entries.opt(index))
    }
    return trimmed
  }
}

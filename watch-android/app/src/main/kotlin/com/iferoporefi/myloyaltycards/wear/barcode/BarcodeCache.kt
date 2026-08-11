package com.iferoporefi.myloyaltycards.wear.barcode

/**
 * Identity of one generated barcode: its value, ZXing format name, and target pixel size. Re-opening
 * the same card at the same size hits the cache; a resize (e.g. a round vs square container) is a
 * distinct entry. A `data class` so equality/hashing are value-based — the whole point of the key.
 */
internal data class BarcodeCacheKey(
    val value: String,
    val format: String,
    val width: Int,
    val height: Int,
)

/**
 * A tiny thread-safe LRU memo cache.
 *
 * Generic and free of ZXing/Android types so its hit-and-evict semantics are unit-tested on the JVM
 * with a plain value (AC11's "cache hit behaviour"). [WearBarcodeGenerator] parameterises `V` with a
 * result that carries a pure-JVM `BitMatrix`, so re-opening a card returns the **same** cached
 * instance and never re-encodes (AC10).
 *
 * `@Synchronized` guards every access because the generator is a single shared instance that a
 * `Dispatchers.Default` worker reads while the UI thread may request the next size. Encoding happens
 * inside the lock, which is safe here precisely because generation is expected off the main thread
 * (see [WearBarcodeGenerator]); the UI thread never calls in, so it is never blocked.
 *
 * @param maxEntries hard cap on retained entries; the least-recently-used is evicted past it.
 */
internal class BarcodeCache<V>(private val maxEntries: Int) {
    init {
        require(maxEntries > 0) { "maxEntries must be > 0, was $maxEntries" }
    }

    // Access-order LinkedHashMap: iteration order is LRU-first, so removeEldestEntry drops the
    // least-recently-used once the map outgrows the cap.
    private val entries = object : LinkedHashMap<BarcodeCacheKey, V>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: Map.Entry<BarcodeCacheKey, V>): Boolean = size > maxEntries
    }

    /** Returns the cached value for [key], or computes it with [produce], stores, and returns it. */
    @Synchronized
    fun getOrPut(key: BarcodeCacheKey, produce: (BarcodeCacheKey) -> V): V =
        entries[key] ?: produce(key).also { entries[key] = it }

    /** Current number of retained entries — exposed for tests to assert eviction. */
    @get:Synchronized
    val size: Int
        get() = entries.size
}

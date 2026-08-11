package com.iferoporefi.myloyaltycards.wear.data

/**
 * The Kotlin mirror of the phone → watch wire payload (`WatchCardPayload` in
 * `core/watch-connectivity.ts:155-167`). It keeps the **wire field names** (`barcodeValue`,
 * `colorHex`) rather than the entity's names, so the wire↔entity rename happens in exactly one
 * place — [toEntity] — never scattered across call sites (AC7).
 *
 * This is the seam Story 10-6 decodes an incoming Data Layer item into before persisting. Story
 * 10-5 defines it (and the mapper) but wires **no transport**; 10-6 owns the JSON decode and the
 * Data Layer plumbing.
 *
 * The defaults encode the "absent field → default, never a crash" contract (AC7): a payload from a
 * newer or older phone build that omits [isFavorite] reads as `false` (Story 9-4), [usageCount]
 * reads as `0`, and [brandId]/[lastUsedAt] are nullable. The genuinely-required wire fields ([id],
 * [name], [colorHex], [barcodeValue], [barcodeFormat], [createdAt]) have **no** default, so a
 * payload missing one cannot be constructed — that is the contract, made structural.
 *
 * @property barcodeImageBase64 Carried only so a decoder can read it off the wire; it is
 *   **never persisted** (Open Decision 4 / AC8) — 10-4 renders barcodes locally via ZXing, so the
 *   pre-rendered image is dead weight and by far the largest field.
 * @property updatedAt Has **no wire source today** (Open Decision 3). Present so that if the phone
 *   ever starts sending it, 10-6 can pass it through without a schema migration; until then it is
 *   `null` and must never be synthesised locally.
 */
data class WatchCardPayload(
    val id: String,
    val name: String,
    val brandId: String? = null,
    val colorHex: String,
    val barcodeValue: String,
    val barcodeFormat: String,
    val barcodeImageBase64: String? = null,
    val usageCount: Int = 0,
    val lastUsedAt: String? = null,
    val createdAt: String,
    val isFavorite: Boolean = false,
    val updatedAt: String? = null,
)

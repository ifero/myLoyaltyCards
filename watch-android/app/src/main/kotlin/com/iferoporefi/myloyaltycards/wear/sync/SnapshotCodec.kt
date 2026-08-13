package com.iferoporefi.myloyaltycards.wear.sync

import com.iferoporefi.myloyaltycards.wear.data.WatchCardPayload
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/** One card decoded from the wire, plus the raw JSON text Story 10-5 persists for forward compat. */
internal data class DecodedCard(
    val payload: WatchCardPayload,
    /**
     * The card's own JSON object, re-serialised **without** `barcodeImageBase64`.
     *
     * Story 10-5's `CardEntity.rawPayload` exists so a field added by a newer phone build is
     * preserved rather than lost. The image is stripped first (Open Decision 4): it is by far the
     * largest field and is never read, since Story 10-4 renders barcodes locally with ZXing.
     */
    val rawPayload: String,
)

/** The outcome of decoding a snapshot envelope. */
internal sealed interface SnapshotDecodeResult {
    /** A well-formed snapshot. May legitimately be empty — that is how "all cards deleted" arrives. */
    data class Success(val cards: List<DecodedCard>) : SnapshotDecodeResult

    /** Nothing is applied. [reason] is a low-cardinality label, safe to log. */
    data class Rejected(val reason: String) : SnapshotDecodeResult
}

/**
 * Decodes the phone → watch snapshot envelope (Story 10-6, AC11 / AC12).
 *
 * ### Why a malformed card rejects the WHOLE snapshot
 *
 * The snapshot is applied as a **full replace** so deletions propagate (AC7). That makes
 * "skip the card I could not parse" equivalent to "delete that card from the watch" — a silent
 * data loss triggered by a decoding bug rather than by the user. So a single unusable card
 * rejects the entire envelope and the watch keeps the last good state. This is precisely what
 * AC11's "without partial application" means on a replace-based receiver.
 *
 * ### Unknown versions
 *
 * An envelope whose `version` is not [WearSyncContract.PROTOCOL_VERSION] is rejected rather than
 * best-effort parsed. A future version may reinterpret existing field names, and a full-replace
 * receiver that guesses wrong wipes the user's list.
 *
 * Uses `org.json` (in the Android platform) rather than adding a JSON library: the payload is a
 * flat array of flat objects, and a data-loss-critical path is a poor place to take a new
 * dependency.
 */
internal object SnapshotCodec {

    private const val FIELD_ID = "id"
    private const val FIELD_NAME = "name"
    private const val FIELD_BRAND_ID = "brandId"
    private const val FIELD_COLOR_HEX = "colorHex"
    private const val FIELD_BARCODE_VALUE = "barcodeValue"
    private const val FIELD_BARCODE_FORMAT = "barcodeFormat"
    private const val FIELD_BARCODE_IMAGE = "barcodeImageBase64"
    private const val FIELD_USAGE_COUNT = "usageCount"
    private const val FIELD_LAST_USED_AT = "lastUsedAt"
    private const val FIELD_CREATED_AT = "createdAt"
    private const val FIELD_IS_FAVORITE = "isFavorite"
    private const val FIELD_UPDATED_AT = "updatedAt"

    fun decode(json: String): SnapshotDecodeResult {
        val envelope = try {
            JSONObject(json)
        } catch (_: JSONException) {
            return SnapshotDecodeResult.Rejected("unparseable-envelope")
        }

        // Absent `version` is tolerated as v1 so a phone build predating the versioned envelope
        // still syncs; a version that is PRESENT and different is refused outright.
        val version = envelope.optInt(WearSyncContract.KEY_VERSION, WearSyncContract.PROTOCOL_VERSION)
        if (version != WearSyncContract.PROTOCOL_VERSION) {
            return SnapshotDecodeResult.Rejected("unknown-version")
        }

        if (envelope.optString("type") != WearSyncContract.TYPE_CARDS) {
            return SnapshotDecodeResult.Rejected("unknown-type")
        }

        val payload = envelope.optJSONArray(WearSyncContract.KEY_PAYLOAD)
            ?: return SnapshotDecodeResult.Rejected("missing-payload")

        return decodeCards(payload)
    }

    private fun decodeCards(payload: JSONArray): SnapshotDecodeResult {
        val cards = ArrayList<DecodedCard>(payload.length())
        val seenIds = HashSet<String>(payload.length())

        for (index in 0 until payload.length()) {
            val card = payload.optJSONObject(index)
                ?: return SnapshotDecodeResult.Rejected("non-object-card")

            val decoded = decodeCard(card) ?: return SnapshotDecodeResult.Rejected("malformed-card")

            // Two rows with one id would collapse on upsert, so the snapshot would silently hold
            // fewer cards than the phone sent. Refuse rather than guess which one wins.
            if (!seenIds.add(decoded.payload.id)) {
                return SnapshotDecodeResult.Rejected("duplicate-card-id")
            }
            cards += decoded
        }

        return SnapshotDecodeResult.Success(cards)
    }

    /** Decode one card, or `null` if a required field is missing or the wrong shape. */
    private fun decodeCard(card: JSONObject): DecodedCard? {
        val id = card.requiredString(FIELD_ID) ?: return null
        val name = card.requiredString(FIELD_NAME) ?: return null
        val colorHex = card.requiredString(FIELD_COLOR_HEX) ?: return null
        val barcodeValue = card.requiredString(FIELD_BARCODE_VALUE) ?: return null
        val barcodeFormat = card.requiredString(FIELD_BARCODE_FORMAT) ?: return null
        val createdAt = card.requiredString(FIELD_CREATED_AT) ?: return null

        val payload = WatchCardPayload(
            id = id,
            name = name,
            // Optional fields follow Story 10-5's "absent field → default, never a crash"
            // contract: the phone's sanitiser omits nulls entirely, so an absent `brandId` and a
            // null `brandId` must decode identically.
            brandId = card.nullableString(FIELD_BRAND_ID),
            colorHex = colorHex,
            barcodeValue = barcodeValue,
            barcodeFormat = barcodeFormat,
            // Read off the wire but never persisted. The phone should not be sending it on this
            // path at all (AC13); tolerating it keeps an older phone build from being rejected.
            barcodeImageBase64 = card.nullableString(FIELD_BARCODE_IMAGE),
            usageCount = card.optInt(FIELD_USAGE_COUNT, 0),
            lastUsedAt = card.nullableString(FIELD_LAST_USED_AT),
            createdAt = createdAt,
            isFavorite = card.optBoolean(FIELD_IS_FAVORITE, false),
            updatedAt = card.nullableString(FIELD_UPDATED_AT),
        )

        return DecodedCard(payload = payload, rawPayload = card.withoutBarcodeImage().toString())
    }

    /**
     * A copy of the card object with `barcodeImageBase64` removed, so the preserved raw payload
     * does not carry the one field we deliberately never store.
     */
    private fun JSONObject.withoutBarcodeImage(): JSONObject {
        if (!has(FIELD_BARCODE_IMAGE)) return this
        // `JSONObject(JSONObject, String[])` is not available on all API levels; copying key by
        // key is the portable form and keeps every unknown field, which is the point of AC8.
        val copy = JSONObject()
        for (key in keys()) {
            if (key == FIELD_BARCODE_IMAGE) continue
            copy.put(key, get(key))
        }
        return copy
    }

    /**
     * A present, non-null, non-blank string, or `null`.
     *
     * `optString` is not usable directly: it returns the literal `"null"` for a JSON null and
     * `""` for an absent key, so both would sail through as "present" and a card could be stored
     * with the name `"null"`.
     */
    private fun JSONObject.requiredString(key: String): String? {
        if (!has(key) || isNull(key)) return null
        val value = opt(key)
        if (value !is String || value.isEmpty()) return null
        return value
    }

    /** A present, non-null string, or `null` for absent/JSON-null/wrong-typed keys. */
    private fun JSONObject.nullableString(key: String): String? {
        if (!has(key) || isNull(key)) return null
        return opt(key) as? String
    }
}

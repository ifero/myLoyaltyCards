package com.iferoporefi.myloyaltycards.wear.data

/**
 * The single, explicit boundary between the three card shapes on Wear OS (AC7):
 *
 * - [WatchCardPayload] — the wire shape (phone → watch), wire field names.
 * - [CardEntity] — the persisted Room row.
 * - [WearCard] — the read-only shape the UI (Story 10-3) consumes.
 *
 * Keeping every rename here — `barcodeValue` ↔ `barcode`, `colorHex` ↔ `color` — mirrors the
 * phone's own rule that DB and client shapes are transformed at the boundary, never conflated. If
 * a field ever drifts, it drifts in exactly one file.
 */

/**
 * Wire → entity (Story 10-6's ingest path). The only place the wire→entity rename lives.
 *
 * [rawPayload] is the original decoded JSON text for forward compatibility (AC8); the caller
 * (Story 10-6) is responsible for stripping `barcodeImageBase64` from it first (Open Decision 4).
 * [WatchCardPayload.barcodeImageBase64] is deliberately **not** copied onto the entity — 10-4
 * renders barcodes locally, so persisting the pre-rendered image would bloat every row for nothing.
 */
fun WatchCardPayload.toEntity(rawPayload: String? = null): CardEntity =
    CardEntity(
        id = id,
        name = name,
        barcode = barcodeValue, // wire `barcodeValue` -> entity `barcode`
        barcodeFormat = barcodeFormat,
        brandId = brandId,
        color = colorHex, // wire `colorHex` -> entity `color`
        isFavorite = isFavorite,
        lastUsedAt = lastUsedAt,
        usageCount = usageCount,
        createdAt = createdAt,
        updatedAt = updatedAt,
        rawPayload = rawPayload,
    )

/**
 * Entity → domain (the repository's read path). Produces the [WearCard] Story 10-3's UI already
 * consumes, so 10-3 needs no change beyond dependency wiring (AC10).
 */
fun CardEntity.toWearCard(): WearCard =
    WearCard(
        id = id,
        name = name,
        brandId = brandId,
        colorHex = color, // entity `color` -> domain `colorHex`
        barcodeValue = barcode, // entity `barcode` -> domain `barcodeValue`
        barcodeFormat = barcodeFormat,
        usageCount = usageCount,
        lastUsedAt = lastUsedAt,
        createdAt = createdAt,
        isFavorite = isFavorite,
    )

/**
 * Domain → entity, used **only** by the DEBUG sample-card seeder, which holds [WearCard]s
 * ([DebugSampleCards]). [WearCard] widened `barcodeValue`/`barcodeFormat`/`colorHex` to nullable
 * for the list UI; the entity mirrors the non-null wire contract, so absent values collapse to
 * empty strings here. Real cards arrive via [WatchCardPayload.toEntity], never this path.
 */
fun WearCard.toEntity(): CardEntity =
    CardEntity(
        id = id,
        name = name,
        barcode = barcodeValue.orEmpty(),
        barcodeFormat = barcodeFormat.orEmpty(),
        brandId = brandId,
        color = colorHex.orEmpty(),
        isFavorite = isFavorite,
        lastUsedAt = lastUsedAt,
        usageCount = usageCount,
        createdAt = createdAt,
        updatedAt = null,
        rawPayload = null,
    )

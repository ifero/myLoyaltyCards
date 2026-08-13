package com.iferoporefi.myloyaltycards.wear.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.SQLiteConnection
import androidx.sqlite.execSQL
import com.iferoporefi.myloyaltycards.wear.BuildConfig
import com.iferoporefi.myloyaltycards.wear.usage.UsageEventEntity
import com.iferoporefi.myloyaltycards.wear.usage.UsageOutboxDao

/**
 * The Wear OS card database (Story 10.5) — Room, and the **only** storage surface on the watch.
 *
 * `version = 1` with `exportSchema = true`: the schema JSON is written to `app/schemas/` (see the
 * `room { }` block in `app/build.gradle.kts`) and committed, so the next schema change can be
 * generated and diffed against it, and the migration test in `CardMigrationTest` can validate a
 * real migration before one is ever needed under pressure (AC3, AC4).
 *
 * ### Migration policy
 *
 * Every schema change bumps [VERSION] and adds a [Migration] to [ALL_MIGRATIONS]. There is **no
 * destructive fallback in release builds**: silently dropping a user's cards on an unhandled
 * version change is exactly the "data survives an app update" failure (AC3). A destructive
 * fallback is enabled **only** in debug — build-type-scoped via [BuildConfig.DEBUG], a compile-time
 * constant, so the branch is absent from the release APK entirely — purely so schema churn during
 * development does not force a manual uninstall.
 */
@Database(
    entities = [CardEntity::class, UsageEventEntity::class],
    version = WearDatabase.VERSION,
    exportSchema = true,
)
abstract class WearDatabase : RoomDatabase() {
    abstract fun cardDao(): CardDao

    /** The `CARD_USED` outbox (Story 10-6). Outbound, watch-local work — never card data. */
    abstract fun usageOutboxDao(): UsageOutboxDao

    companion object {
        /** Current schema version. Bump on every schema change and add the matching migration. */
        const val VERSION = 2

        private const val DB_NAME = "cards.db"

        /**
         * v1 → v2: adds the `usage_outbox` table (Story 10-6).
         *
         * Additive only — it does not touch `cards`, so a user upgrading keeps every synced card
         * (AC3 of Story 10-5). The DDL must match what Room generates for [UsageEventEntity]
         * byte for byte, or Room's post-migration schema validation fails at runtime; the
         * authority is `app/schemas/…/2.json`, and `CardMigrationTest` runs the real migration
         * against the exported v1 schema so a mismatch fails in CI rather than on a wrist.
         */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(connection: SQLiteConnection) {
                connection.execSQL(
                    "CREATE TABLE IF NOT EXISTS `usage_outbox` (" +
                        "`eventId` TEXT NOT NULL, " +
                        "`cardId` TEXT NOT NULL, " +
                        "`usedAt` TEXT NOT NULL, " +
                        "`enqueuedAt` TEXT NOT NULL, " +
                        "PRIMARY KEY(`eventId`))",
                )
            }
        }

        /**
         * The ordered migration path. Each version bump appends its `MIGRATION_(n-1)_n` here;
         * `CardMigrationTest` proves the harness works so that a migration is a fill-in-the-blank
         * rather than a first attempt under release pressure.
         */
        val ALL_MIGRATIONS: Array<Migration> = arrayOf(MIGRATION_1_2)

        @Volatile
        private var instance: WearDatabase? = null

        /**
         * Process-wide singleton. Room warns (and can corrupt) if two live instances open the same
         * file, so the whole app shares one, created lazily on first use.
         */
        fun getInstance(context: Context): WearDatabase =
            instance ?: synchronized(this) {
                instance ?: build(context.applicationContext).also { instance = it }
            }

        private fun build(context: Context): WearDatabase =
            Room.databaseBuilder(context, WearDatabase::class.java, DB_NAME)
                .addMigrations(*ALL_MIGRATIONS)
                .apply {
                    if (BuildConfig.DEBUG) {
                        // DEBUG ONLY. Drops and recreates on any unhandled version change so a
                        // developer iterating on the schema is not forced to uninstall. FORBIDDEN
                        // in release: it would silently wipe every stored card (the AC3 failure).
                        // Guarded by the compile-time BuildConfig.DEBUG, so it cannot reach release.
                        fallbackToDestructiveMigration(dropAllTables = true)
                    }
                }
                .build()
    }
}

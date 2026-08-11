package com.iferoporefi.myloyaltycards.wear.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import com.iferoporefi.myloyaltycards.wear.BuildConfig

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
@Database(entities = [CardEntity::class], version = WearDatabase.VERSION, exportSchema = true)
abstract class WearDatabase : RoomDatabase() {
    abstract fun cardDao(): CardDao

    companion object {
        /** Current schema version. Bump on every schema change and add the matching migration. */
        const val VERSION = 1

        private const val DB_NAME = "cards.db"

        /**
         * The ordered migration path. Empty at v1 — there is nothing before it to migrate from.
         * Each version bump appends its `MIGRATION_(n-1)_n` here; `CardMigrationTest` proves the
         * harness works so that the first real migration is a fill-in-the-blank, not a first
         * attempt under release pressure.
         */
        val ALL_MIGRATIONS: Array<Migration> = emptyArray()

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

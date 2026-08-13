package com.iferoporefi.myloyaltycards.wear.data

import androidx.room.migration.Migration
import androidx.sqlite.SQLiteConnection
import androidx.sqlite.driver.AndroidSQLiteDriver
import androidx.sqlite.execSQL
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * Proves a schema upgrade preserves the user's cards (Story 10.5, AC3/AC4).
 *
 * Story 10.5 shipped this as a *template* against a throwaway migration, because v1 was the only
 * schema that existed. Story 10-6 supplies the first real one — v1 → v2 adds the `usage_outbox`
 * table — so the test now drives [WearDatabase.MIGRATION_1_2] itself. That matters more than the
 * template did: the DDL in a `Migration` is hand-written and must match what Room generates for
 * the entity byte for byte, or Room's post-migration validation fails at runtime, on a user's
 * wrist, after the upgrade has already been installed.
 *
 * It runs under Robolectric (the same JVM, no-emulator runtime as the DAO tests) and drives a real
 * `SQLiteConnection` via [AndroidSQLiteDriver] — Room's default Android driver, backed here by
 * Robolectric's SQLite. This is deliberately lighter than Room's `MigrationTestHelper`, which is
 * instrumentation-oriented and reads the exported schema from packaged assets; the direct
 * `migrate()` call proves the same data-preservation contract without that wiring.
 */
@RunWith(RobolectricTestRunner::class)
class CardMigrationTest {
    private val context = RuntimeEnvironment.getApplication()
    private val driver = AndroidSQLiteDriver()

    private fun dbPath(): String =
        context.getDatabasePath(DB_NAME).also { it.parentFile?.mkdirs() }.path

    @Before
    fun setUp() {
        context.deleteDatabase(DB_NAME)
    }

    @After
    fun tearDown() {
        context.deleteDatabase(DB_NAME)
    }

    /**
     * The v1 → v2 upgrade path a user actually takes: they have cards, they install the build
     * that adds the outbox, and their cards must still be there.
     */
    @Test
    fun migrationPreservesExistingRows() {
        val path = dbPath()

        // 1) Stand up a v1 database exactly as Room exported it (app/schemas/.../1.json) and insert
        //    a row that must survive the upgrade.
        driver.open(path).use { connection ->
            connection.execSQL(V1_CREATE_CARDS)
            connection.execSQL(
                "INSERT INTO `cards` " +
                    "(id,name,barcode,barcodeFormat,brandId,color,isFavorite,lastUsedAt,usageCount,createdAt,updatedAt,rawPayload) " +
                    "VALUES ('a','Esselunga','5901234123457','EAN13',NULL,'#1A73E8',1," +
                    "'2026-08-01T09:00:00.123Z',12,'2026-01-10T09:00:00.000Z',NULL,NULL)",
            )
            connection.execSQL("PRAGMA user_version = 1")
        }

        // 2) Apply the REAL migration through a fresh connection (the driver-based migrate path).
        driver.open(path).use { connection ->
            WearDatabase.MIGRATION_1_2.migrate(connection)
            connection.execSQL("PRAGMA user_version = 2")
        }

        // 3) The pre-existing card is intact, milliseconds included (AC6) — the migration is
        //    additive and must not have touched `cards` at all.
        driver.open(path).use { connection ->
            connection.prepare("SELECT name, usageCount, lastUsedAt FROM `cards` WHERE id = 'a'").use { stmt ->
                assertTrue("row preserved across migration", stmt.step())
                assertEquals("Esselunga", stmt.getText(0))
                assertEquals(12L, stmt.getLong(1))
                assertEquals("2026-08-01T09:00:00.123Z", stmt.getText(2))
            }
        }

        // 4) The new outbox table exists and is usable.
        driver.open(path).use { connection ->
            connection.execSQL(
                "INSERT INTO `usage_outbox` (eventId, cardId, usedAt, enqueuedAt) " +
                    "VALUES ('a:2026-08-12T10:00:00.123Z','a','2026-08-12T10:00:00.123Z','2026-08-12T10:00:01.000Z')",
            )
            connection.prepare("SELECT COUNT(*) FROM `usage_outbox`").use { stmt ->
                assertTrue(stmt.step())
                assertEquals(1L, stmt.getLong(0))
            }
        }
    }

    /**
     * The migration's hand-written DDL must equal what Room generates for `UsageEventEntity`, or
     * Room's post-migration schema validation throws at runtime on an upgraded install.
     *
     * Comparing against the committed exported schema is what makes this checkable in CI: Room
     * writes `app/schemas/<db>/2.json` on every build, and `${'$'}{TABLE_NAME}` is the placeholder it
     * uses for the table name there.
     */
    @Test
    fun migrationDdlMatchesTheExportedSchema() {
        val path = dbPath()

        driver.open(path).use { connection ->
            WearDatabase.MIGRATION_1_2.migrate(connection)
        }

        driver.open(path).use { connection ->
            connection
                .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='usage_outbox'")
                .use { stmt ->
                    assertTrue("usage_outbox created", stmt.step())
                    val actual = stmt.getText(0)
                    assertEquals(
                        EXPORTED_V2_CREATE_USAGE_OUTBOX.replace("\${TABLE_NAME}", "usage_outbox")
                            .removePrefix("CREATE TABLE IF NOT EXISTS ")
                            .let { "CREATE TABLE $it" },
                        actual,
                    )
                }
        }
    }

    private companion object {
        const val DB_NAME = "cards-migration-test.db"

        /** The v1 `CREATE TABLE`, copied from the committed exported schema `1.json`. */
        const val V1_CREATE_CARDS =
            "CREATE TABLE IF NOT EXISTS `cards` (`id` TEXT NOT NULL, `name` TEXT NOT NULL, " +
                "`barcode` TEXT NOT NULL, `barcodeFormat` TEXT NOT NULL, `brandId` TEXT, " +
                "`color` TEXT NOT NULL, `isFavorite` INTEGER NOT NULL, `lastUsedAt` TEXT, " +
                "`usageCount` INTEGER NOT NULL, `createdAt` TEXT NOT NULL, `updatedAt` TEXT, " +
                "`rawPayload` TEXT, PRIMARY KEY(`id`))"

        /** `createSql` for `usage_outbox`, copied verbatim from the exported schema `2.json`. */
        const val EXPORTED_V2_CREATE_USAGE_OUTBOX =
            "CREATE TABLE IF NOT EXISTS `\${TABLE_NAME}` (`eventId` TEXT NOT NULL, " +
                "`cardId` TEXT NOT NULL, `usedAt` TEXT NOT NULL, `enqueuedAt` TEXT NOT NULL, " +
                "PRIMARY KEY(`eventId`))"
    }
}

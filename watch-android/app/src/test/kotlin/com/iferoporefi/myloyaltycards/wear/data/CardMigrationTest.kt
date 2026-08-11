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
 * Proves the migration harness works **before** a real migration is needed (Story 10.5, AC4).
 *
 * Story 10-5 ships schema `version = 1` only, so there is no real migration yet. This test writes a
 * throwaway v1→v2 migration, applies it to a hand-built v1 database, and asserts the existing row
 * survives — exactly the guarantee AC3 needs ("data survives an app update"). When a real v2 lands,
 * this is the template: bump [WearDatabase.VERSION], add the real `MIGRATION_1_2` to
 * [WearDatabase.ALL_MIGRATIONS], regenerate the exported schema, and adapt this test.
 *
 * It runs under Robolectric (the same JVM, no-emulator runtime as the DAO tests) and drives a real
 * `SQLiteConnection` via [AndroidSQLiteDriver] — Room's default Android driver, backed here by
 * Robolectric's SQLite. This is deliberately lighter than Room's `MigrationTestHelper`, which is
 * instrumentation-oriented and reads the exported schema from packaged assets; the direct
 * `migrate()` call proves the same data-preservation contract without that wiring. Once a real
 * migration and a committed per-version schema exist, `MigrationTestHelper` becomes worthwhile for
 * validating the post-migration schema against the exported JSON.
 */
@RunWith(RobolectricTestRunner::class)
class CardMigrationTest {
    private val context = RuntimeEnvironment.getApplication()
    private val driver = AndroidSQLiteDriver()

    /**
     * Demonstrative next migration: add a nullable column. A real migration replaces this body; the
     * mechanism under test — register a [Migration], it runs, data is preserved — is identical.
     */
    private val migration1to2 =
        object : Migration(1, 2) {
            override fun migrate(connection: SQLiteConnection) {
                connection.execSQL("ALTER TABLE `cards` ADD COLUMN `note` TEXT")
            }
        }

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

        // 2) Apply the migration through a fresh connection (the driver-based migrate path).
        driver.open(path).use { connection ->
            migration1to2.migrate(connection)
            connection.execSQL("PRAGMA user_version = 2")
        }

        // 3) The pre-existing row is intact — including millisecond timestamps (AC6) — and the new
        //    v2 column exists, defaulting to NULL.
        driver.open(path).use { connection ->
            connection.prepare("SELECT name, usageCount, lastUsedAt, note FROM `cards` WHERE id = 'a'").use { stmt ->
                assertTrue("row preserved across migration", stmt.step())
                assertEquals("Esselunga", stmt.getText(0))
                assertEquals(12L, stmt.getLong(1))
                assertEquals("2026-08-01T09:00:00.123Z", stmt.getText(2))
                assertTrue("new v2 column present and null", stmt.isNull(3))
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
    }
}

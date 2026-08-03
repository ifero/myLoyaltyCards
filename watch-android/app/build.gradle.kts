/*
 * Wear OS companion app — pure Kotlin + Compose for Wear OS.
 *
 * No React Native, no JavaScript, no Expo module lives here, exactly as
 * `targets/watch/` is pure Swift/SwiftUI. See ../README.md.
 */
plugins {
    alias(libs.plugins.android.application)
    // The Compose compiler ships with Kotlin (2.0+) and is applied as its own
    // plugin. AGP 9's built-in Kotlin support covers plain Kotlin compilation,
    // but NOT the Compose compiler, so this is still required.
    alias(libs.plugins.compose.compiler)
}

/**
 * Play allocates `versionCode` per *application ID*, and this Wear APK shares
 * `com.iferoporefi.myloyaltycards` with the phone app — so it is a third
 * consumer of one shared counter space, after the phone's beta and production
 * bands. Story 16.7 introduced `PRODUCTION_VERSION_CODE_OFFSET = 1_000_000` in
 * `app.config.ts` for exactly this reason; the Wear APK takes the next band up.
 *
 * Bands (see ../README.md § versionCode bands):
 *   0         phone, alpha/beta   (`beta-releases.yml`, bare run number)
 *   1_000_000 phone, production   (`store-upload.yml`)
 *   2_000_000 Wear OS APK         (this build)
 *
 * Deliberately NOT read from `app.config.ts`: the two projects share no build
 * system, and coupling them would reintroduce the "anything in `android/` is
 * regenerated" trap that Story 16.7 exists to document.
 */
val wearVersionCodeBand = 2_000_000

/** Play rejects any `versionCode` above this. */
val playMaxVersionCode = 2_100_000_000

/**
 * CI supplies the per-release counter in `WEAR_VERSION_CODE` (a distinct name
 * from the phone's `ANDROID_VERSION_CODE`, so a Wear build can never silently
 * inherit the phone's counter). When the variable is **absent** the build is a
 * local one and gets the bare band, which is fine: nothing built locally is
 * uploadable — release signing material is not in this repo.
 *
 * When the variable is **present but unusable** the build fails instead of
 * falling back. That distinction is the whole point. An empty, zero, negative or
 * non-numeric value almost always means CI wiring is broken (an unset GitHub
 * variable interpolates to the empty string), and silently substituting the bare
 * band would produce a *valid-looking* versionCode that is indistinguishable
 * from a legitimate first upload — which is precisely the class of failure
 * Story 16.7 exists to document.
 *
 * This deliberately **diverges** from `app.config.ts`'s `resolveAndroidVersionCode`,
 * which takes the opposite stance for the phone app: on an `ANDROID_VERSION_CODE`
 * that is present but invalid it silently falls back to a Unix-timestamp
 * versionCode. That behaviour is deliberate and tested there, and this story does
 * not touch it — but it is not a precedent worth copying into a fresh build.
 *
 * Read via `providers` rather than `System.getenv` so the value is a tracked
 * configuration-cache input instead of an untracked read.
 */
val wearVersionCounter: Int =
    providers.environmentVariable("WEAR_VERSION_CODE").orNull?.trim()?.let { raw ->
        raw.toIntOrNull()?.takeIf { it > 0 }
            ?: throw GradleException(
                "WEAR_VERSION_CODE is set to \"$raw\" but must be a positive integer. " +
                    "Refusing to fall back to the bare band ($wearVersionCodeBand): a bad " +
                    "counter that still yields a plausible versionCode is exactly the " +
                    "failure mode Story 16.7 documents. Unset the variable for a local build.",
            )
    } ?: 0

/**
 * Computed in `Long` so a large counter cannot silently overflow `Int` into a
 * negative versionCode before the ceiling is checked.
 */
val wearVersionCode: Int =
    (wearVersionCodeBand.toLong() + wearVersionCounter.toLong()).let { computed ->
        if (computed > playMaxVersionCode) {
            throw GradleException(
                "Computed versionCode $computed exceeds Play's maximum of " +
                    "$playMaxVersionCode (band $wearVersionCodeBand + " +
                    "WEAR_VERSION_CODE $wearVersionCounter).",
            )
        }
        computed.toInt()
    }

android {
    // The R class / code package. Deliberately distinct from `applicationId`:
    // it namespaces Wear sources without changing the identity Play sees.
    namespace = "com.iferoporefi.myloyaltycards.wear"

    // compileSdk >= targetSdk. 36 is the newest platform this repo has installed
    // and AGP 9.3 supports up to API 37.
    compileSdk = 36

    defaultConfig {
        // MUST be identical to the phone app's `expo.android.package` in
        // app.json — no `.watch`/`.wear` suffix. Play associates the watch APK
        // with the phone app by application ID, and the Wearable Data Layer
        // will not connect two APKs with different IDs. This is the opposite of
        // targets/watch/expo-target.config.js, which suffixes the watchOS
        // bundle ID with `.watch` because Apple embeds that target instead.
        applicationId = "com.iferoporefi.myloyaltycards"

        // Wear OS 3 floor, and Play's Wear OS app-quality requirement.
        minSdk = 30
        // Play's 2026 rule is API 36 for new submissions, but Wear OS and
        // Android Automotive are explicitly carved out at API 35.
        targetSdk = 35

        versionCode = wearVersionCode
        // Independent of the phone app's `expo.version`; the two ship separately.
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // No `signingConfig`: the release keystore is @ifero's and must be
            // the SAME key as the phone app (Play association + Data Layer both
            // require it). Nothing signing-related is committed to this repo.
        }
    }

    compileOptions {
        // AGP 9 defaults to Java 11; 17 matches the JDK the build requires.
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // Kotlin's `jvmTarget` is not set explicitly: with AGP's built-in Kotlin it
    // defaults to `compileOptions.targetCompatibility`, so the two cannot drift.

    buildFeatures {
        compose = true
    }
}

dependencies {
    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)

    implementation(libs.androidx.activity.compose)

    // Compose for Wear OS.
    // NOTE: do NOT add androidx.compose.material:material — androidx.wear.compose
    // is a replacement for it on Wear, not an addition. Foundation is additive,
    // so the Wear foundation sits alongside the general Compose artifacts.
    implementation(libs.wear.compose.material3)
    implementation(libs.wear.compose.foundation)

    // Wearable Data Layer. Declared here but UNUSED in this story so that
    // Story 10-6 (phone <-> watch sync, CARD_USED usage events) can wire sync up
    // without editing build files. Do not add sync logic before 10-6.
    implementation(libs.play.services.wearable)

    // Wear-specific @Preview annotations, used by the placeholder screen.
    implementation(libs.wear.compose.ui.tooling)
    // The preview renderer itself is debug-only and never ships in the APK.
    debugImplementation(libs.androidx.compose.ui.tooling)
}

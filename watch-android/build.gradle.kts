/*
 * Top-level build file for the Wear OS companion app.
 *
 * Plugins are declared here with `apply false` and applied in `app/build.gradle.kts`;
 * this keeps a single place where the plugin versions are resolved from
 * `gradle/libs.versions.toml`.
 *
 * Note there is no `org.jetbrains.kotlin.android` plugin: AGP 9 ships built-in
 * Kotlin support and enables it by default, so applying KGP separately is no
 * longer required. The Compose compiler plugin is still separate.
 */
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.compose.compiler) apply false
}

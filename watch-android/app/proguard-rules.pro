# R8 / ProGuard rules for the Wear OS companion app.
#
# AndroidX, Compose for Wear OS and Play Services Wearable all publish their own
# consumer rules, so the release build needs nothing extra for those.
#
# Add rules here only when a release build actually needs them — and say which
# class and which library needed it, so the rule can be removed when the library
# fixes its own consumer rules.

# ZXing barcode generation (Story 10.4). `com.google.zxing:core` ships NO consumer
# ProGuard rules, and CI only builds the debug variant (`wear-os-build.yml` runs
# `testDebugUnitTest assembleDebug`), so nothing would catch R8 mis-optimising the
# barcode path in the *release* APK — the only build users receive. Full-mode R8 is
# free to be maximally aggressive on a dependency with no rules, and the concern is
# concrete: our invalid-value handling (AC2) relies on ZXing's writers *throwing*
# for bad input (a wrong EAN-13 check digit, an over-capacity QR); if R8 pruned
# those validation/throw branches, a bad card would render a wrong or blank symbol in
# release instead of the error state. Keeping the writer path whole makes the release
# encode byte-for-byte the emulator-verified debug path (confirmed: with these rules
# the writers are retained in release `mapping.txt`, vs stripped/inlined without them;
# our handling catches the exception *type*, so R8 dropping message strings is
# harmless). NOTE: a full end-to-end barcode render in a *release* build can only be
# exercised once Story 10-6 sync provides cards — release strips the DEBUG seeder — so
# that final check is a 10-6 pre-release step (see the story's Dev Agent Record).
-keep class com.google.zxing.BarcodeFormat { *; }
-keep class com.google.zxing.EncodeHintType { *; }
-keep class com.google.zxing.MultiFormatWriter { *; }
-keep class com.google.zxing.Writer { *; }
-keep class com.google.zxing.oned.** { *; }
-keep class com.google.zxing.qrcode.QRCodeWriter { *; }
-keep class com.google.zxing.qrcode.encoder.** { *; }
-keep class com.google.zxing.qrcode.decoder.** { *; }
-keep class com.google.zxing.common.** { *; }

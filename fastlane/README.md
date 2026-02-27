## fastlane documentation

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios fetch_certificates

```sh
[bundle exec] fastlane ios fetch_certificates
```

Fetch certificates (appstore, adhoc, development)

### ios build_dev

```sh
[bundle exec] fastlane ios build_dev
```

Build iOS Dev app

### ios adhoc

```sh
[bundle exec] fastlane ios adhoc
```

Build iOS AdHoc app

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload to TestFlight

---

## Android

### android build_dev

```sh
[bundle exec] fastlane android build_dev
```

Build Android Dev app

### android adhoc

```sh
[bundle exec] fastlane android adhoc
```

Build Android AdHoc app

### android beta

```sh
[bundle exec] fastlane android beta
```

Build and upload to Play Console (beta)

---

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).

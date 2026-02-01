# AGENTS.md

## Project Overview

- **Project Name**: myLoyaltyCards
- **Type**: Expo/React Native mobile application
- **User**: Ifero
- **Skill Level**: Expert
- **Languages**: English (communication and documentation)

Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## 🚨 MANDATORY: Context7 MCP Server

**ALWAYS use the Context7 MCP server when working with ANY library or framework.**

Before implementing code that uses a library:

1. **Resolve the library ID first**:
   ```
   Use mcp_context7_resolve-library-id with the library name
   ```

2. **Query the documentation**:
   ```
   Use mcp_context7_query-docs with the resolved library ID and your specific question
   ```

This ensures you have **up-to-date, accurate documentation** rather than relying on potentially outdated training data.

### When to Use Context7

- Installing new dependencies
- Using unfamiliar APIs
- Implementing features with specific libraries (expo-camera, expo-sqlite, react-native-reanimated, etc.)
- Troubleshooting library-specific errors
- Checking for breaking changes or migration guides

## Documentation Resources

When working on this project, **always consult the official Expo documentation** available at:

- **https://docs.expo.dev/llms.txt** - Index of all available documentation files
- **https://docs.expo.dev/llms-full.txt** - Complete Expo documentation including Expo Router, Expo Modules API, development process
- **https://docs.expo.dev/llms-eas.txt** - Complete EAS (Expo Application Services) documentation
- **https://docs.expo.dev/llms-sdk.txt** - Complete Expo SDK documentation
- **https://reactnative.dev/docs/getting-started** - Complete React Native documentation

These documentation files are specifically formatted for AI agents and should be your **primary reference** for:

- Expo APIs and best practices
- Expo Router navigation patterns
- EAS Build, Submit, and Update workflows
- Expo SDK modules and their usage
- Development and deployment processes

## Essential Commands

### Development

```bash
npx expo start                  # Start dev server
npx expo start --clear          # Clear cache and start dev server
npx expo install <package>      # Install packages with compatible versions
npx expo install --check        # Check which installed packages need to be updated
npx expo install --fix          # Automatically update any invalid package versions
```

### Building & Testing

```bash
npx expo prebuild               # Generate native projects
npx expo run:ios                # Build and run on iOS device
npx expo run:android            # Build and run on Android device
npx expo doctor                 # Check project health and dependencies
npm expo lint                   # Run ESLint
```

### Production

```bash
npx eas-cli@latest build --platform ios -s            # Use EAS to build for iOS platform and submit to App Store
npx eas-cli@latest build --platform android -s        # Use EAS to build for Android platform and submit to Google Play Store
npx expo export -p web && npx eas-cli@latest deploy   # Deploy web to EAS Hosting
```

## 🚨 Critical Instructions (From Dev Memory)

### Library Installation (Expo Projects)

**ALWAYS use the following process when adding new libraries:**

1. **Use Expo's install command:**
   ```bash
   npx expo install [library-name]
   ```
   - This ensures version compatibility with the current Expo SDK
   - **NEVER use `yarn add` or `npm install` directly** for Expo-compatible libraries

2. **Check Context7 MCP** for proper setup instructions for the library
   - Verify any required native configuration
   - Check for any additional setup steps (permissions, plugins, etc.)

**Why This Matters:**
- Expo SDK versions have specific compatible library versions
- Using `npx expo install` automatically resolves the correct version
- Manual installation with yarn/npm can cause version conflicts and runtime errors

### Critical Import Order: react-native-get-random-values

**When using `uuid` or any crypto-dependent library:**

1. **MUST import `react-native-get-random-values` BEFORE any library that uses it**
   ```typescript
   import 'react-native-get-random-values'; // Must be FIRST
   import { v4 as uuidv4 } from 'uuid';
   ```

2. This polyfill provides the `crypto.getRandomValues()` API required by `uuid` and similar libraries

3. **Typical location:** Root layout file (`app/_layout.tsx`) as the very first import

**Why This Matters:**
- React Native doesn't have native `crypto.getRandomValues()` support
- Without this polyfill, uuid and crypto libraries will crash at runtime
- Import order is critical - the polyfill must execute before any dependent code

## Development Principles

### Code Style & Standards

- **TypeScript First**: Use TypeScript for all new code with strict type checking
- **Naming Conventions**: Use meaningful, descriptive names for variables, functions, and components
- **Self-Documenting Code**: Write clear, readable code that explains itself; only add comments for complex business logic or design decisions
- **React 19 Patterns**: Follow modern React patterns including:
  - Function components with hooks
  - Enable React Compiler
  - Proper dependency arrays in useEffect
  - Memoization when appropriate (useMemo, useCallback)
  - Error boundaries for better error handling

### Recommended Libraries

- **Navigation**: `expo-router` for navigation
- **Images**: `expo-image` for optimized image handling and caching
- **Animations**: `react-native-reanimated` for performant animations on native thread
- **Gestures**: `react-native-gesture-handler` for native gesture recognition
- **Storage**: Use `expo-sqlite` for persistent storage, `expo-sqlite/kv-store` for simple key-value storage

## Debugging & Development Tools

### DevTools Integration

- **React Native DevTools**: Use MCP `open_devtools` command to launch debugging tools
- **Network Inspection**: Monitor API calls and network requests in DevTools
- **Element Inspector**: Debug component hierarchy and styles
- **Performance Profiler**: Identify performance bottlenecks
- **Logging**: Use `console.log` for debugging (remove before production), `console.warn` for deprecation notices, `console.error` for actual errors, and implement error boundaries for production error handling

### Testing & Quality Assurance

#### Automated Testing with MCP Tools

Developers can configure the Expo MCP server with the following doc: https://docs.expo.dev/eas/ai/mcp/

- **Component Testing**: Add `testID` props to components for automation
- **Visual Testing**: Use MCP `automation_take_screenshot` to verify UI appearance
- **Interaction Testing**: Use MCP `automation_tap_by_testid` to simulate user interactions
- **View Verification**: Use MCP `automation_find_view_by_testid` to validate component rendering

## Troubleshooting

### Expo Go Errors & Development Builds

If there are errors in **Expo Go** or the project is not running, create a **development build**. **Expo Go** is a sandbox environment with a limited set of native modules. To create development builds, run `eas build:dev`. Additionally, after installing new packages or adding config plugins, new development builds are often required.

## AI Agent Instructions

When working on this project:

1. **Always start by consulting the appropriate documentation**:

   - For general Expo questions: https://docs.expo.dev/llms-full.txt
   - For EAS/deployment questions: https://docs.expo.dev/llms-eas.txt
   - For SDK/API questions: https://docs.expo.dev/llms-sdk.txt

2. **Understand before implementing**: Read the relevant docs section before writing code

3. **Follow existing patterns**: Look at existing components and screens for patterns to follow

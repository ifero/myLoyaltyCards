# Dev Agent Memory - Critical Instructions

This file contains critical instructions that must be followed during development sessions.

---

## Library Installation (Expo Projects)

**ALWAYS use the following process when adding new libraries:**

1. **Use Expo's install command:**

   ```bash
   npx expo install [library-name]
   ```

   - This ensures version compatibility with the current Expo SDK
   - Never use `yarn add` or `npm install` directly for Expo-compatible libraries

2. **Check context7 MCP** for proper setup instructions for the library
   - Verify any required native configuration
   - Check for any additional setup steps (permissions, plugins, etc.)

### Why This Matters

- Expo SDK versions have specific compatible library versions
- Using `npx expo install` automatically resolves the correct version
- Manual installation with yarn/npm can cause version conflicts and runtime errors

---

## Critical Import Order: react-native-get-random-values

**When using `uuid` or any crypto-dependent library:**

1. **MUST import `react-native-get-random-values` BEFORE any library that uses it**

   ```typescript
   import 'react-native-get-random-values'; // Must be FIRST
   import { v4 as uuidv4 } from 'uuid';
   ```

2. This polyfill provides the `crypto.getRandomValues()` API required by `uuid` and similar libraries

3. **Typical location:** Root layout file (`app/_layout.tsx`) as the very first import

### Why This Matters

- React Native doesn't have native `crypto.getRandomValues()` support
- Without this polyfill, uuid and crypto libraries will crash at runtime
- Import order is critical - the polyfill must execute before any dependent code

---

## Changelog

| Date       | Instruction                                             | Added By                               |
| ---------- | ------------------------------------------------------- | -------------------------------------- |
| 2026-01-31 | Library installation process for Expo projects          | Dev Agent (after expo-camera incident) |
| 2026-02-01 | react-native-get-random-values import order requirement | Dev Agent                              |

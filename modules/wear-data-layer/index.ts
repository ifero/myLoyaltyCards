// Local Expo module: the phone-side Wearable Data Layer transport (Story 10-6).
//
// Android only. On iOS the default export is `null` — see `src/WearDataLayerModule.ts`.
// All card-aware logic lives in `core/wear-connectivity.ts`, not here.
export { default } from './src/WearDataLayerModule';
export type {
  WearInboundMessage,
  WearDataLayerModuleEvents,
  WearDataLayerNativeModule
} from './src/WearDataLayerModule';

import { NativeModule, requireOptionalNativeModule } from 'expo';

/**
 * One watch → phone message retained in the native durable inbox.
 *
 * `data` is the raw UTF-8 body exactly as it came off the wire — this module never interprets
 * it. `id` is opaque and exists only so the consumer can acknowledge the message once it has
 * been applied.
 */
export interface WearInboundMessage {
  id: string;
  path: string;
  data: string;
}

/**
 * The module emits a payload-free nudge: the inbox is the source of truth, so a listener
 * reacts by reading it rather than by trusting anything the event carries.
 *
 * Declared as a `type` rather than an `interface` on purpose: `NativeModule<Events>` constrains
 * its parameter to `EventsMap`, which carries a string index signature. A type alias of an
 * object literal gets an implicit index signature and satisfies it; an interface does not.
 */
export type WearDataLayerModuleEvents = {
  onInboundMessage: () => void;
};

declare class WearDataLayerNativeModule extends NativeModule<WearDataLayerModuleEvents> {
  /** Whether Google Play services is present and usable on this device. */
  isSupported(): Promise<boolean>;
  /** Number of currently connected wearable nodes. Zero means nothing is listening. */
  getConnectedNodeCount(): Promise<number>;
  /** Publishes `json` as the DataItem at `path`, replacing whatever was there. */
  publishSnapshot(path: string, json: string): Promise<boolean>;
  /** Sends `json` to every connected node at `path`. Resolves with the delivery count. */
  sendMessage(path: string, json: string): Promise<number>;
  /** Retained watch → phone messages, oldest first. Non-destructive — acknowledge to remove. */
  readInboundMessages(): Promise<WearInboundMessage[]>;
  /** Drops acknowledged messages from the durable inbox. Resolves with the number removed. */
  acknowledgeInboundMessages(ids: string[]): Promise<number>;
}

/**
 * `requireOptionalNativeModule`, not `requireNativeModule`: this module declares Android only
 * (`expo-module.config.json`), so on iOS there is nothing to load and the strict variant would
 * throw at import time — inside a module the iOS bundle still evaluates. `null` here is the
 * normal, expected value on iOS, and `core/wear-connectivity.ts` treats it as "no Android
 * wearable transport", which is exactly true.
 */
const WearDataLayer = requireOptionalNativeModule<WearDataLayerNativeModule>('WearDataLayer');

export default WearDataLayer;
export type { WearDataLayerNativeModule };

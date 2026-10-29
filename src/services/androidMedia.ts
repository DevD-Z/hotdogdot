import { isAndroidWebView } from './nativeAudio';

/**
 * What the Android activity polls out of the page once a second to feed the
 * platform MediaSession behind the notification and lock-screen controls.
 *
 * Times are milliseconds, matching MediaMetadata and PlaybackState.
 */
export interface AndroidMediaSnapshot {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  playing: boolean;
  position: number;
  duration: number;
}

export type AndroidMediaCommand = 'play' | 'pause' | 'next' | 'previous' | 'stop' | 'seek';

declare global {
  interface Window {
    __hdMedia?: AndroidMediaSnapshot | null;
    __hdMediaCommand?: (command: AndroidMediaCommand, value?: number) => void;
  }
}

/**
 * Android WebView never turns `navigator.mediaSession` into a platform session,
 * so the notification is built on the Kotlin side instead and this is the seam.
 * Everywhere else — desktop, iOS, the browser — the standard Media Session API
 * already works and this does nothing.
 */
export const usesAndroidMediaBridge = (): boolean => isAndroidWebView();

export function publishAndroidMedia(snapshot: AndroidMediaSnapshot | null): void {
  if (!usesAndroidMediaBridge()) return;
  window.__hdMedia = snapshot;
}

export function setAndroidMediaCommandHandler(
  handler: ((command: AndroidMediaCommand, value: number) => void) | null,
): void {
  if (!usesAndroidMediaBridge()) return;
  if (handler) {
    window.__hdMediaCommand = (command, value) => handler(command, value ?? 0);
  } else {
    delete window.__hdMediaCommand;
  }
}

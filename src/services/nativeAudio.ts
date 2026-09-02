import type { Track } from '../types/music';
import type { NativeAudioState } from 'tauri-plugin-native-audio-api';
import * as nativeAudioApi from 'tauri-plugin-native-audio-api';
import { logger } from './logger';

const isMobileRuntime = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  || navigator.maxTouchPoints > 0
  || window.matchMedia?.('(pointer: coarse)').matches;

export const isNativeMobile = (): boolean =>
  ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) && isMobileRuntime();

const youtubeUrl = /(?:youtube\.com|youtube-nocookie\.com|youtu\.be)/i;

export function nativeSourceFor(track: Track | null): string | null {
  if (!isNativeMobile() || !track) return null;
  const source = track.playbackUrl || track.uri;
  if (!source || source.startsWith('blob:') || youtubeUrl.test(source)) return null;
  if (/^(https?:\/\/|file:\/\/|asset:\/\/|\/)/i.test(source)) return source;
  return null;
}

let initialization: Promise<NativeAudioState> | null = null;

function initialize(): Promise<NativeAudioState> {
  if (!initialization) {
    initialization = nativeAudioApi.initialize().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

function stableTrackId(identifier: string): number {
  let hash = 2166136261;
  for (let index = 0; index < identifier.length; index += 1) {
    hash ^= identifier.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const nativeAudio = {
  async prepare(track: Track): Promise<NativeAudioState> {
    const src = nativeSourceFor(track);
    if (!src) throw new Error('Track has no native-playable source');
    await initialize();
    logger.addLog('info', 'Player', `Preparing native audio: ${track.title}`);
    return nativeAudioApi.setSource({
      src,
      id: stableTrackId(track.identifier),
      title: track.title,
      artist: track.author,
      artworkUrl: track.artworkUrl,
    });
  },
  play: async () => { await initialize(); return nativeAudioApi.play(); },
  pause: async () => { await initialize(); return nativeAudioApi.pause(); },
  seekTo: async (seconds: number) => { await initialize(); return nativeAudioApi.seekTo(seconds); },
  state: async () => { await initialize(); return nativeAudioApi.getState(); },
  listen: async (handler: (state: NativeAudioState) => void) => {
    await initialize();
    // v1.0.5's declaration says it returns an unsubscribe function, while
    // Tauri 2 actually returns a PluginListener object. Normalize both shapes.
    const listener = await nativeAudioApi.addStateListener(handler) as unknown as
      | (() => void | Promise<void>)
      | { unregister: () => Promise<void> };
    return () => {
      if (typeof listener === 'function') return listener();
      return listener.unregister();
    };
  },
};

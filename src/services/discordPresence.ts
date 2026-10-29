import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';
import { Track } from '../types/music';

const isDesktopTauri = () => '__TAURI_INTERNALS__' in window && !/Android|iPhone|iPad/i.test(navigator.userAgent);

class DiscordPresenceService {
  private initialized = false;
  private disabled = false;
  private lastPayload = '';

  async initialize(): Promise<void> {
    if (!isDesktopTauri() || this.initialized || this.disabled) return;
    try {
      await invoke('discord_initialize');
      this.initialized = true;
      logger.addLog('success', 'System', 'Discord Rich Presence connected');
    } catch (error) {
      this.disabled = true;
      logger.addLog('info', 'System', `Discord Rich Presence unavailable: ${String(error)}`);
    }
  }

  private resolveTrackArtwork(track: Track): string | undefined {
    if (track.artworkUrl && /^https?:\/\//i.test(track.artworkUrl)) {
      return track.artworkUrl;
    }
    if (track.identifier && /^[a-zA-Z0-9_-]{11}$/.test(track.identifier)) {
      return `https://i.ytimg.com/vi/${track.identifier}/hqdefault.jpg`;
    }
    return undefined;
  }

  async update(page: string, details?: string, track?: Track | null, isPlaying: boolean = true): Promise<void> {
    if (!isDesktopTauri()) return;

    let finalDetails = details;
    let finalStateText = `Browsing ${page}`;
    let finalLargeImage = 'hotdogdot';
    let finalLargeText = 'hotdogdot';
    let finalSmallImage: string | undefined = undefined;
    let finalSmallText: string | undefined = undefined;

    if (track) {
      const artwork = this.resolveTrackArtwork(track);
      finalDetails = track.title;
      finalStateText = track.author ? `by ${track.author}` : (isPlaying ? 'Playing' : 'Paused');
      finalLargeImage = artwork || 'hotdogdot';
      finalLargeText = track.title;
      if (artwork) {
        finalSmallImage = 'hotdogdot';
        finalSmallText = isPlaying ? 'Playing on hotdogdot' : 'hotdogdot';
      }
    } else {
      finalDetails = finalDetails || 'Using hotdogdot';
    }

    const payload = `${page}|${finalDetails}|${finalStateText}|${finalLargeImage}|${finalLargeText}|${finalSmallImage}|${finalSmallText}`;
    if (payload === this.lastPayload) return;

    await this.initialize();
    if (!this.initialized) return;

    try {
      await invoke('discord_update_activity', {
        page,
        details: finalDetails,
        stateText: finalStateText,
        largeImage: finalLargeImage,
        largeText: finalLargeText,
        smallImage: finalSmallImage,
        smallText: finalSmallText,
      });
      this.lastPayload = payload;
    } catch (error) {
      this.initialized = false;
      logger.addLog('info', 'System', `Discord activity update skipped: ${String(error)}`);
    }
  }

  async clear(): Promise<void> {
    if (!isDesktopTauri() || !this.initialized) return;
    try { await invoke('discord_clear_activity'); } catch { /* Discord can close before the app. */ }
  }
}

export const discordPresence = new DiscordPresenceService();

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

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

  async update(page: string, details = 'Using hotdogdot'): Promise<void> {
    if (!isDesktopTauri()) return;
    const payload = `${page}|${details}`;
    if (payload === this.lastPayload) return;
    await this.initialize();
    if (!this.initialized) return;
    try {
      await invoke('discord_update_activity', { page, details });
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

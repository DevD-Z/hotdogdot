import { LavalinkServerPreset } from '../types/music';
import { normalizeLavalinkEndpoint } from './lavalinkUrl';

// Default servers set to empty - Users must provide their own server settings
export const PUBLIC_LAVALINK_SERVERS: LavalinkServerPreset[] = [
  {
    id: 'hotdogdot-main',
    name: 'hotdogdot Lavalink',
    host: 'hotdogdot-lavalink.onrender.com',
    port: 443,
    password: '',
    secure: true,
    location: 'Render Cloud',
    description: 'เซิร์ฟเวอร์หลักของ hotdogdot (กรอกรหัสผ่านในหน้าตั้งค่า)',
  },
  {
    id: 'local-lavalink',
    name: 'Local Lavalink',
    host: 'localhost',
    port: 2333,
    password: 'hotdogdot-local-lavalink',
    secure: false,
    location: 'This device',
    description: 'Lavalink v4 node bundled with hotdogdot via Docker',
  },
];

const ALL_SERVERS_KEY = 'hotdogdot_all_lavalink_servers_v2';

export function getStoredLavalinkServers(): LavalinkServerPreset[] {
  try {
    const raw = localStorage.getItem(ALL_SERVERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(server => normalizeLavalinkEndpoint(server as LavalinkServerPreset));
        localStorage.setItem(ALL_SERVERS_KEY, JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch {
    // Fallback
  }
  return PUBLIC_LAVALINK_SERVERS;
}

export function saveCustomLavalinkServer(server: Omit<LavalinkServerPreset, 'id'>): LavalinkServerPreset[] {
  const newServer: LavalinkServerPreset = normalizeLavalinkEndpoint({
    ...server,
    id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  });

  const current = getStoredLavalinkServers();
  const updated = [...current, newServer];
  localStorage.setItem(ALL_SERVERS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteLavalinkServer(id: string): LavalinkServerPreset[] {
  const current = getStoredLavalinkServers();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(ALL_SERVERS_KEY, JSON.stringify(updated));
  return updated;
}

export function resetLavalinkServers(): LavalinkServerPreset[] {
  localStorage.removeItem(ALL_SERVERS_KEY);
  return PUBLIC_LAVALINK_SERVERS;
}

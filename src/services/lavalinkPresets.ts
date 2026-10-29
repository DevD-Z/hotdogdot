import { LavalinkServerPreset } from '../types/music';
import { normalizeLavalinkEndpoint } from './lavalinkUrl';

const ENV_LAVALINK_PASSWORD =
  import.meta.env.LAVALINK_SERVER_PASSWORD ||
  import.meta.env.VITE_LAVALINK_SERVER_PASSWORD ||
  import.meta.env.VITE_LAVALINK_PASSWORD ||
  'vbACVyNIWpg1MquLE1j7ZiLEK9fwBA8_yCFQ0_bRFkWWp2LB';

export const PUBLIC_LAVALINK_SERVERS: LavalinkServerPreset[] = [
  {
    id: 'hotdogdot-main',
    name: 'hotdogdot Lavalink',
    host: 'hotdogdot-lavalink.onrender.com',
    port: 443,
    password: ENV_LAVALINK_PASSWORD,
    secure: true,
    location: 'Render Cloud',
    description: 'เซิร์ฟเวอร์หลักของ hotdogdot',
  },
];

const ALL_SERVERS_KEY = 'hotdogdot_all_lavalink_servers_v2';

export function getStoredLavalinkServers(): LavalinkServerPreset[] {
  try {
    const raw = localStorage.getItem(ALL_SERVERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter(
          server => server.host !== 'localhost' && server.host !== '127.0.0.1'
        );
        if (filtered.length > 0) {
          const normalized = filtered.map(server => {
            const norm = normalizeLavalinkEndpoint(server as LavalinkServerPreset);
            if (norm.host === 'hotdogdot-lavalink.onrender.com' && (!norm.password || norm.password === '')) {
              norm.password = ENV_LAVALINK_PASSWORD;
            }
            return norm;
          });
          localStorage.setItem(ALL_SERVERS_KEY, JSON.stringify(normalized));
          return normalized;
        }
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

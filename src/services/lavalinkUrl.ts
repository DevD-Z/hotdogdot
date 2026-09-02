import { LavalinkConfig } from '../types/music';

type LavalinkEndpoint = Pick<LavalinkConfig, 'host' | 'port' | 'secure'>;

function cleanHost(host: string): string {
  return host.trim().replace(/^(?:(?:https?|wss?):\/\/)+/i, '');
}

export function normalizeLavalinkEndpoint<T extends LavalinkEndpoint>(config: T): T {
  const rawHost = cleanHost(config.host);
  const input = `${config.secure ? 'https' : 'http'}://${rawHost}`;

  try {
    const url = new URL(input);
    const port = Number(url.port || config.port || (config.secure ? 443 : 80));
    return {
      ...config,
      host: url.hostname,
      port,
    };
  } catch {
    return { ...config, host: rawHost.replace(/\/+$/, '') };
  }
}

export function getLavalinkBaseUrl(config: LavalinkEndpoint): string {
  const normalized = normalizeLavalinkEndpoint(config);
  const protocol = normalized.secure ? 'https' : 'http';
  const isDefaultPort = (normalized.secure && normalized.port === 443)
    || (!normalized.secure && normalized.port === 80);
  return `${protocol}://${normalized.host}${isDefaultPort ? '' : `:${normalized.port}`}`;
}

export function getLavalinkWebSocketUrl(config: LavalinkEndpoint): string {
  return getLavalinkBaseUrl(config).replace(/^http/i, 'ws');
}

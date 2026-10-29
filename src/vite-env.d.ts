/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly LAVALINK_SERVER_PASSWORD?: string;
  readonly VITE_LAVALINK_SERVER_PASSWORD?: string;
  readonly VITE_LAVALINK_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

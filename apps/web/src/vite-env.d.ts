/* eslint-disable unicorn/filename-case */
/// <reference types="vite/client" />

/** Inyectada en build-time por vite.config.ts (define) — versión real del deploy */
// eslint-disable-next-line no-underscore-dangle
declare const __ARCHON_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly REDIS_URL: string;
  readonly JWT_SECRET: string;
  readonly CALENDAR_CREDENTIALS_URL: string;
  readonly CALENDAR_ACCESS_KEY: string;
  readonly CALENDAR_CREDENTIALS_KEY: string;
  readonly ENV_FILE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

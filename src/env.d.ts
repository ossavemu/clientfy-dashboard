/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly REDIS_URL: string;
  readonly JWT_SECRET: string;
  readonly CALENDAR_CREDENTIALS_URL: string;
  readonly CALENDAR_ACCESS_KEY: string;
  readonly CALENDAR_CREDENTIALS_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

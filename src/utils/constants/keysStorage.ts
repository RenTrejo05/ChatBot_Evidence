export const KEYS_STORAGE = {
  LANGUAGE_KEY_STORAGE: "@languageKeyStorage",
  USER_SESSION_STORAGE: "_userSessionStorage",
  SESSION_EXPIRY: "_sessionExpiry",
  TEST1: "_test1",
  TEST2: "@test2",
} as const;

export type KeyStorageKeys = keyof typeof KEYS_STORAGE;

export type KeyStorageValues = (typeof KEYS_STORAGE)[keyof typeof KEYS_STORAGE];

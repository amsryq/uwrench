import { SETTINGS_SCHEMA_VERSION, type SettingsEnvelope } from "../settings/settings-types";
import type { QuickLink } from "../features/quick-links/storage";
import type { FolderPasswords } from "../features/folder-password/storage";

export function getDefaultEnvelope(): SettingsEnvelope {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    features: {},
  };
}

type StorageKey = `local:${string}` | `session:${string}` | `sync:${string}` | `managed:${string}`;

function defineStorageItem<T>(key: StorageKey, getFallback: () => T) {
  const item = storage.defineItem<T>(key, {
    fallback: getFallback(),
  });

  return {
    item,
    reset: () => item.setValue(getFallback()),
  };
}

const settingsStorage = defineStorageItem("local:uwrench:settings", getDefaultEnvelope);
export const settingsItem = settingsStorage.item;

const quickLinksStorage = defineStorageItem<QuickLink[]>("local:quick_links", () => []);
export const quickLinksItem = quickLinksStorage.item;

const folderPasswordsStorage = defineStorageItem<FolderPasswords>(
  "session:folder_passwords",
  () => ({}),
);
export const folderPasswordsItem = folderPasswordsStorage.item;

const pinnedFoldersStorage = defineStorageItem<string[]>("local:pinned_folders", () => []);
export const pinnedFoldersItem = pinnedFoldersStorage.item;

export type LoginRedirectState = Record<string, string>;

const loginRedirectStateStorage = defineStorageItem<LoginRedirectState>(
  "session:login_redirect_state",
  () => ({}),
);
export const loginRedirectStateItem = loginRedirectStateStorage.item;

export const clearableStorageItems = [
  settingsStorage,
  quickLinksStorage,
  folderPasswordsStorage,
  pinnedFoldersStorage,
] as const;

export function getDefaultSettingsEnvelope(): SettingsEnvelope {
  return getDefaultEnvelope();
}

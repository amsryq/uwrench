export const SETTINGS_SCHEMA_VERSION = 1 as const;

export type SettingsEnvelope = {
  schemaVersion: number;
  updatedAt?: string;
  features: Record<string, StoredFeatureState>;
};

export type StoredFeatureState = {
  enabled?: boolean;
  options?: unknown;
  sub?: Record<string, StoredSubFeatureState>;
};

export type StoredSubFeatureState = {
  enabled?: boolean;
  options?: unknown;
};

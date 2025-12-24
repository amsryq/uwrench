import { SETTINGS_SCHEMA_VERSION, type SettingsEnvelope } from './settings-types';

const RAW_SETTINGS_KEY = 'uwrench:settings';
const STORAGE_SETTINGS_KEY = `local:${RAW_SETTINGS_KEY}`;

function defaultEnvelope(): SettingsEnvelope {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    features: {},
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeEnvelope(raw: unknown): SettingsEnvelope {
  if (!isObject(raw)) return defaultEnvelope();

  const schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  const features = isObject(raw.features) ? (raw.features as Record<string, any>) : {};
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined;

  // Only v1 exists right now; keep forward-compatible by preserving unknown fields.
  if (schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    // Best-effort migration: preserve feature states, reset schema version.
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      updatedAt,
      features: features ?? {},
    };
  }

  return {
    schemaVersion,
    updatedAt,
    features,
  };
}

export async function loadSettings(): Promise<SettingsEnvelope> {
  const raw = await storage.getItem<unknown>(STORAGE_SETTINGS_KEY);
  return normalizeEnvelope(raw);
}

export async function saveSettings(next: SettingsEnvelope): Promise<void> {
  await storage.setItem(STORAGE_SETTINGS_KEY, {
    ...next,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateSettings(
  updater: (current: SettingsEnvelope) => SettingsEnvelope | Promise<SettingsEnvelope>,
): Promise<SettingsEnvelope> {
  const current = await loadSettings();
  const next = await updater(current);
  await saveSettings(next);
  return next;
}

export async function setFeatureEnabled(featureId: string, enabled: boolean): Promise<void> {
  await updateSettings((current) => {
    const prev = current.features[featureId] ?? {};
    return {
      ...current,
      features: {
        ...current.features,
        [featureId]: {
          ...prev,
          enabled,
        },
      },
    };
  });
}

export async function setSubFeatureEnabled(
  featureId: string,
  subFeatureId: string,
  enabled: boolean,
): Promise<void> {
  await updateSettings((current) => {
    const prev = current.features[featureId] ?? {};
    const prevSub = prev.sub ?? {};
    const prevSubState = prevSub[subFeatureId] ?? {};

    return {
      ...current,
      features: {
        ...current.features,
        [featureId]: {
          ...prev,
          sub: {
            ...prevSub,
            [subFeatureId]: {
              ...prevSubState,
              enabled,
            },
          },
        },
      },
    };
  });
}

export async function setFeatureOptions(featureId: string, options: unknown): Promise<void> {
  await updateSettings((current) => {
    const prev = current.features[featureId] ?? {};
    return {
      ...current,
      features: {
        ...current.features,
        [featureId]: {
          ...prev,
          options,
        },
      },
    };
  });
}

export async function setSubFeatureOptions(
  featureId: string,
  subFeatureId: string,
  options: unknown,
): Promise<void> {
  await updateSettings((current) => {
    const prev = current.features[featureId] ?? {};
    const prevSub = prev.sub ?? {};
    const prevSubState = prevSub[subFeatureId] ?? {};

    return {
      ...current,
      features: {
        ...current.features,
        [featureId]: {
          ...prev,
          sub: {
            ...prevSub,
            [subFeatureId]: {
              ...prevSubState,
              options,
            },
          },
        },
      },
    };
  });
}

export type SettingsWatcher = (next: SettingsEnvelope, prev: SettingsEnvelope) => void;

export function watchSettings(watcher: SettingsWatcher): () => void {
  let stopped = false;
  let last: SettingsEnvelope | null = null;

  const init = async () => {
    last = await loadSettings();
  };

  void init();

  const handler = (
    changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
    areaName: string,
  ) => {
    if (stopped) return;
    if (areaName !== 'local') return;

    const change = changes[RAW_SETTINGS_KEY];
    if (!change) return;

    const prev = last ?? defaultEnvelope();
    const next = normalizeEnvelope(change.newValue);
    last = next;
    watcher(next, prev);
  };

  // In WXT, `browser` is available in extension contexts.
  browser.storage.onChanged.addListener(handler);

  return () => {
    stopped = true;
    browser.storage.onChanged.removeListener(handler);
  };
}

export function getRawSettingsKey(): string {
  return RAW_SETTINGS_KEY;
}

export async function clearAllStorage(): Promise<void> {
  await browser.storage.local.clear();
}

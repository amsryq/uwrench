import type { SettingsEnvelope, StoredFeatureState } from '../settings/settings-types';
import { loadSettings, watchSettings } from '../settings/settings-store';
import type { FeatureDef, FeatureState, PatchDef, PatchHandle, PatchId, RegistryId, RuntimeEnv } from './types';
import { createRegistries, ensureRegistry, type RuntimeRegistries } from './registries';

type ActiveFeature = {
  cleanup?: () => void | Promise<void>;
  enabled: boolean;
  restartRequired: boolean;
  stateSig?: string;
};

type ActivePatch = {
  cleanup?: () => void | Promise<void>;
  handle?: PatchHandle;
  refCount: number;
};

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function safeObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);

    if (Array.isArray(v)) return v.map(normalize);

    const out: Record<string, any> = {};
    for (const key of Object.keys(v).sort()) {
      out[key] = normalize(v[key]);
    }
    return out;
  };

  try {
    return JSON.stringify(normalize(value));
  } catch {
    return String(value);
  }
}

function resolveFeatureState<TOptions, TSub extends Record<string, unknown>>(
  def: FeatureDef<TOptions, TSub>,
  stored: StoredFeatureState | undefined,
): FeatureState<TOptions, TSub> {
  const storedObj = stored ? safeObject(stored) : {};
  const storedSub = safeObject(storedObj.sub) as Record<string, any>;

  const enabled = toBoolean(storedObj.enabled, def.defaults.enabled);

  const options = (storedObj.options ?? def.defaults.options) as TOptions;

  const sub = {} as any;
  const subDefs = def.subFeatures ?? ({} as any);
  for (const subId of Object.keys(subDefs)) {
    const subDef = subDefs[subId];
    const s = safeObject(storedSub[subId]);
    sub[subId] = {
      enabled: toBoolean(s.enabled, subDef.defaults.enabled),
      options: (s.options ?? subDef.defaults.options) as any,
    };
  }

  return {
    enabled,
    options,
    sub,
  };
}

function getRegistryIdsFromFeature(def: FeatureDef<any, any>): RegistryId[] {
  return def.dependsOnRegistries ?? [];
}

function getPatchIdsFromFeature(def: FeatureDef<any, any>): PatchId[] {
  return def.dependsOnPatches ?? [];
}

function getRegistryIdsFromPatch(def: PatchDef<any>): RegistryId[] {
  return def.registries ?? [];
}

export type FeatureManagerConfig = {
  env: RuntimeEnv;
  features: Array<FeatureDef<any, any, any>>;
  patches: Array<PatchDef<any>>;
};

export class FeatureManager {
  private readonly env: RuntimeEnv;
  private readonly featuresById: Map<string, FeatureDef<any, any, any>>;
  private readonly patchesById: Map<PatchId, PatchDef<any>>;

  private readonly registries: RuntimeRegistries = createRegistries();
  private readonly activePatches: Map<PatchId, ActivePatch> = new Map();
  private readonly activeFeatures: Map<string, ActiveFeature> = new Map();

  private settings: SettingsEnvelope | null = null;
  private stopWatching: (() => void) | null = null;

  constructor(config: FeatureManagerConfig) {
    this.env = config.env;
    this.featuresById = new Map(config.features.map((f) => [f.id, f]));
    this.patchesById = new Map(config.patches.map((p) => [p.id, p]));
  }

  async start(): Promise<void> {
    this.settings = await loadSettings();
    await this.applyAll();

    this.stopWatching = watchSettings(async (next) => {
      this.settings = next;
      await this.applyAll();
    });
  }

  stop(): void {
    this.stopWatching?.();
    this.stopWatching = null;
  }

  private async applyAll(): Promise<void> {
    const settings = this.settings;
    if (!settings) return;

    for (const def of this.featuresById.values()) {
      const stored = settings.features[def.id];
      const resolved = resolveFeatureState(def as any, stored);
      await this.applyFeature(def, resolved);
    }
  }

  private async ensurePatchesForFeature(def: FeatureDef<any, any, any>): Promise<Record<PatchId, PatchHandle>> {
    const patchIds = getPatchIdsFromFeature(def);
    const patchHandles: Partial<Record<PatchId, PatchHandle>> = {};

    for (const patchId of patchIds) {
      const patch = this.patchesById.get(patchId);
      if (!patch) {
        throw new Error(`Unknown patch dependency: ${patchId} (feature: ${def.id})`);
      }

      const active = this.activePatches.get(patchId);
      if (active) {
        active.refCount += 1;
        if (active.handle) patchHandles[patchId] = active.handle;
        continue;
      }

      // Ensure registries needed by patch exist.
      for (const regId of getRegistryIdsFromPatch(patch)) {
        if (regId === 'contentTableActions') ensureRegistry(this.registries, 'contentTableActions');
        if (regId === 'courseListPanels') ensureRegistry(this.registries, 'courseListPanels');
      }

      const result = patch.setup({ env: this.env, registries: this.registries as any });
      this.activePatches.set(patchId, {
        cleanup: result.cleanup,
        handle: result.handle,
        refCount: 1,
      });
      if (result.handle) patchHandles[patchId] = result.handle;
    }

    return patchHandles as Record<PatchId, PatchHandle>;
  }

  private getPatchHandlesForFeature(def: FeatureDef<any, any, any>): Record<PatchId, PatchHandle> {
    const patchIds = getPatchIdsFromFeature(def);
    const patchHandles: Partial<Record<PatchId, PatchHandle>> = {};

    for (const patchId of patchIds) {
      const active = this.activePatches.get(patchId);
      if (active?.handle) patchHandles[patchId] = active.handle;
    }

    return patchHandles as Record<PatchId, PatchHandle>;
  }

  private async releasePatchesForFeature(def: FeatureDef<any, any, any>): Promise<void> {
    const patchIds = getPatchIdsFromFeature(def);

    for (const patchId of patchIds) {
      const active = this.activePatches.get(patchId);
      if (!active) continue;
      active.refCount -= 1;
      if (active.refCount > 0) continue;

      this.activePatches.delete(patchId);
      await active.cleanup?.();
    }
  }

  private async applyFeature(def: FeatureDef<any, any, any>, state: FeatureState<any, any>): Promise<void> {
    const prev = this.activeFeatures.get(def.id);
    const restartRequired = Boolean(def.restartRequired);
    const nextSig = stableStringify(state);

    if (restartRequired) {
      // If restart required, only apply once at startup (if enabled) and ignore live changes.
      if (!prev) {
        if (state.enabled) {
          const patches = await this.ensurePatchesForFeature(def);
          const ctx = {
            env: this.env,
            registries: this.pickRegistriesForFeature(def),
            patches,
          };
          const result = await def.setup(ctx as any, state);
          this.activeFeatures.set(def.id, {
            enabled: true,
            cleanup: result.cleanup,
            restartRequired: true,
            stateSig: nextSig,
          });
        } else {
          this.activeFeatures.set(def.id, {
            enabled: false,
            cleanup: undefined,
            restartRequired: true,
            stateSig: nextSig,
          });
        }
      }
      return;
    }

    if (!prev && !state.enabled) {
      this.activeFeatures.set(def.id, {
        enabled: false,
        restartRequired,
        cleanup: undefined,
        stateSig: nextSig,
      });
      return;
    }

    // Enabled -> ensure running
    if (state.enabled) {
      if (prev?.enabled) {
        if (prev.stateSig === nextSig) return;

        // Reconfigure by re-running setup.
        await prev.cleanup?.();

        const patches = this.getPatchHandlesForFeature(def);
        const ctx = {
          env: this.env,
          registries: this.pickRegistriesForFeature(def),
          patches,
        };
        const result = await def.setup(ctx as any, state);

        for (const patchId of getPatchIdsFromFeature(def)) {
          const handle = this.activePatches.get(patchId)?.handle;
          await handle?.refresh?.();
        }

        this.activeFeatures.set(def.id, {
          enabled: true,
          cleanup: result.cleanup,
          restartRequired,
          stateSig: nextSig,
        });
        return;
      }

      const patches = await this.ensurePatchesForFeature(def);
      const ctx = {
        env: this.env,
        registries: this.pickRegistriesForFeature(def),
        patches,
      };

      const result = await def.setup(ctx as any, state);

      // Ask dependent patches to refresh after new registrations.
      for (const patchId of getPatchIdsFromFeature(def)) {
        const handle = this.activePatches.get(patchId)?.handle;
        await handle?.refresh?.();
      }

      this.activeFeatures.set(def.id, {
        enabled: true,
        cleanup: result.cleanup,
        restartRequired,
        stateSig: nextSig,
      });
      return;
    }

    // Disabled -> cleanup
    if (prev?.enabled) {
      await prev.cleanup?.();
      await this.releasePatchesForFeature(def);

      // Ask dependent patches to refresh after unregistration.
      for (const patchId of getPatchIdsFromFeature(def)) {
        const handle = this.activePatches.get(patchId)?.handle;
        await handle?.refresh?.();
      }
    }

    this.activeFeatures.set(def.id, {
      enabled: false,
      cleanup: undefined,
      restartRequired,
      stateSig: nextSig,
    });
  }

  private pickRegistriesForFeature(def: FeatureDef<any, any, any>): RuntimeRegistries {
    const registryIds = getRegistryIdsFromFeature(def);
    const picked: RuntimeRegistries = {};

    for (const id of registryIds) {
      if (id === 'contentTableActions') {
        picked.contentTableActions = ensureRegistry(this.registries, 'contentTableActions');
      }
      if (id === 'courseListPanels') {
        picked.courseListPanels = ensureRegistry(this.registries, 'courseListPanels');
      }
    }

    return picked;
  }
}

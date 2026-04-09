import type { SettingsEnvelope, StoredFeatureState } from '../settings/settings-types';
import { loadSettings, watchSettings } from '../settings/settings-store';
import type { Cleanup, ContentRuntimeContext, FeatureDef, FeatureState } from './types';

type ActiveFeature = {
  cleanup?: () => void | Promise<void>;
  enabled: boolean;
  stateSig?: string;
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

export type FeatureBinding<TContext = any> = {
  feature: FeatureDef<any, any, TContext>;
  context?: TContext;
};

export type FeatureManagerConfig = {
  features: Array<FeatureBinding<any>>;
  contentScriptCtx?: ContentRuntimeContext;
  extraCleanups?: Cleanup[];
};

export class FeatureManager {
  private readonly featuresById: Map<string, FeatureBinding<any>>;
  private readonly contentScriptCtx?: ContentRuntimeContext;
  private readonly extraCleanups: Cleanup[];
  private readonly activeFeatures: Map<string, ActiveFeature> = new Map();

  private settings: SettingsEnvelope | null = null;
  private stopWatching: (() => void) | null = null;

  constructor(config: FeatureManagerConfig) {
    this.featuresById = new Map(config.features.map((binding) => [binding.feature.id, binding]));
    this.contentScriptCtx = config.contentScriptCtx;
    this.extraCleanups = [...(config.extraCleanups ?? [])];
  }

  async start(): Promise<void> {
    this.settings = await loadSettings();
    await this.applyAll();

    this.contentScriptCtx?.onInvalidated?.(() => {
      void this.shutdown();
    });

    this.stopWatching = watchSettings(async (next) => {
      this.settings = next;
      await this.applyAll();
    });
  }

  stop(): void {
    this.stopWatching?.();
    this.stopWatching = null;
  }

  async shutdown(): Promise<void> {
    this.stop();

    for (const active of this.activeFeatures.values()) {
      await active.cleanup?.();
    }
    this.activeFeatures.clear();

    for (const cleanup of [...this.extraCleanups].reverse()) {
      await cleanup?.();
    }
  }

  private async applyAll(): Promise<void> {
    const settings = this.settings;
    if (!settings) return;

    for (const binding of this.featuresById.values()) {
      const stored = settings.features[binding.feature.id];
      const resolved = resolveFeatureState(binding.feature as any, stored);
      await this.applyFeature(binding, resolved);
    }
  }
  private async applyFeature(binding: FeatureBinding<any>, state: FeatureState<any, any>): Promise<void> {
    const { feature, context } = binding;
    const prev = this.activeFeatures.get(feature.id);
    const nextSig = stableStringify(state);

    if (!prev && !state.enabled) {
      this.activeFeatures.set(feature.id, {
        enabled: false,
        cleanup: undefined,
        stateSig: nextSig,
      });
      return;
    }

    // Enabled -> ensure running
    if (state.enabled) {
      if (prev?.enabled) {
        if (prev.stateSig === nextSig) return;

        await prev.cleanup?.();
        const result = await feature.setup({ ...(context ?? {}), contentScriptCtx: this.contentScriptCtx }, state);

        this.activeFeatures.set(feature.id, {
          enabled: true,
          cleanup: result.cleanup,
          stateSig: nextSig,
        });
        return;
      }

      const result = await feature.setup({ ...(context ?? {}), contentScriptCtx: this.contentScriptCtx }, state);

      this.activeFeatures.set(feature.id, {
        enabled: true,
        cleanup: result.cleanup,
        stateSig: nextSig,
      });
      return;
    }

    // Disabled -> cleanup
    if (prev?.enabled) {
      await prev.cleanup?.();
    }

    this.activeFeatures.set(feature.id, {
      enabled: false,
      cleanup: undefined,
      stateSig: nextSig,
    });
  }
}

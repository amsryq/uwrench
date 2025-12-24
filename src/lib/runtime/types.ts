import type { RegistryId, RuntimeRegistries } from './registries';

export type { RegistryId, RuntimeRegistries } from './registries';

export type Cleanup = () => void | Promise<void>;

export type RuntimeEnv = 'content' | 'background' | 'popup';

export type PatchId = 'courseContentTableActions' | 'courseListPanels';

export type PatchHandle = {
  id: PatchId;
  refresh?: () => void | Promise<void>;
};

export type PatchContext<Registries extends Partial<RuntimeRegistries> = Partial<RuntimeRegistries>> = {
  env: RuntimeEnv;
  registries: Registries;
};

export type PatchSetupResult = {
  handle?: PatchHandle;
  cleanup?: Cleanup;
};

export type PatchDef<Registries extends Partial<RuntimeRegistries> = Partial<RuntimeRegistries>> = {
  id: PatchId;
  registries?: RegistryId[];
  setup: (ctx: PatchContext<Registries>) => PatchSetupResult;
};

export type SubFeatureState<TOptions = unknown> = {
  enabled: boolean;
  options: TOptions;
};

export type FeatureState<TOptions = unknown, TSub extends Record<string, unknown> = Record<string, unknown>> = {
  enabled: boolean;
  options: TOptions;
  sub: { [K in keyof TSub]: SubFeatureState<TSub[K]> };
};

export type SubFeatureDef<TOptions = unknown> = {
  id: string;
  title: string;
  defaults: { enabled: boolean; options: TOptions };
};

export type FeatureContext<
  Registries extends Partial<RuntimeRegistries> = Partial<RuntimeRegistries>,
  Patches extends Partial<Record<PatchId, PatchHandle>> = Partial<Record<PatchId, PatchHandle>>,
> = {
  env: RuntimeEnv;
  registries: Registries;
  patches: Patches;
};

export type FeatureSetupResult = {
  cleanup?: Cleanup;
};

export type FeatureDef<
  TOptions = unknown,
  TSub extends Record<string, unknown> = Record<string, unknown>,
  Registries extends Partial<RuntimeRegistries> = Partial<RuntimeRegistries>,
> = {
  id: string;
  title: string;
  description?: string;
  restartRequired?: boolean;

  defaults: { enabled: boolean; options: TOptions };
  subFeatures?: { [K in keyof TSub]: SubFeatureDef<TSub[K]> };

  dependsOnPatches?: PatchId[];
  dependsOnRegistries?: RegistryId[];

  setup: (
    ctx: FeatureContext<Registries>,
    state: FeatureState<TOptions, TSub>,
  ) => FeatureSetupResult | Promise<FeatureSetupResult>;

  clearData?: () => void | Promise<void>;
};

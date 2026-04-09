export type Cleanup = () => void | Promise<void>;

export type ContentRuntimeContext = {
  isInvalidated?: boolean;
  onInvalidated?: (cleanup: Cleanup) => void;
};

export type SubFeatureState<TOptions = unknown> = {
  enabled: boolean;
  options: TOptions;
};

export type FeatureState<
  TOptions = unknown,
  TSub extends Record<string, unknown> = Record<string, unknown>,
> = {
  enabled: boolean;
  options: TOptions;
  sub: { [K in keyof TSub]: SubFeatureState<TSub[K]> };
};

export type SubFeatureDef<TOptions = unknown> = {
  id: string;
  title: string;
  defaults: { enabled: boolean; options: TOptions };
};

export type FeatureContext<TContext = any> = TContext & {
  contentScriptCtx?: ContentRuntimeContext;
};

export type FeatureSetupResult = {
  cleanup?: Cleanup;
};

export type FeatureDef<
  TOptions = unknown,
  TSub extends Record<string, unknown> = Record<string, unknown>,
  TContext = any,
> = {
  id: string;
  title: string;
  description?: string;
  restartRequired?: boolean;

  defaults: { enabled: boolean; options: TOptions };
  subFeatures?: { [K in keyof TSub]: SubFeatureDef<TSub[K]> };

  setup: (
    ctx: FeatureContext<TContext>,
    state: FeatureState<TOptions, TSub>,
  ) => FeatureSetupResult | Promise<FeatureSetupResult>;

  clearData?: () => void | Promise<void>;
};

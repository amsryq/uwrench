import { FeatureManager, type FeatureBinding } from '../../lib/runtime/feature-manager';
import type { Cleanup, ContentRuntimeContext } from '../../lib/runtime/types';

type ContentScriptRunAt = 'document_start' | 'document_end' | 'document_idle';

type FeatureContentScriptSetup = {
  features: Array<FeatureBinding<any>>;
  extraCleanups?: Cleanup[];
};

type FeatureContentScriptConfig = {
  matches: string[];
  runAt?: ContentScriptRunAt;
  features?: Array<FeatureBinding<any>>;
  setup?: (ctx: ContentRuntimeContext) => FeatureContentScriptSetup;
};

export function defineFeatureContentScript(config: FeatureContentScriptConfig) {
  return defineContentScript({
    matches: config.matches,
    runAt: config.runAt ?? 'document_idle',
    async main(ctx) {
      const resolved = config.setup?.(ctx) ?? { features: config.features ?? [] };

      const manager = new FeatureManager({
        ...resolved,
        contentScriptCtx: ctx,
      });

      void manager.start();
    },
  });
}

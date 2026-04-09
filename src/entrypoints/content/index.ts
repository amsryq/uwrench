import { FeatureManager } from '../../lib/runtime/feature-manager';
import { getGlobalConfig } from '../../lib/runtime/feature-configs';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: 'document_idle',
  async main(ctx) {
    const config = await getGlobalConfig();

    const manager = new FeatureManager({
      env: 'content',
      features: config.features,
      contentScriptCtx: ctx,
    });

    void manager.start();
  },
});

import { FeatureManager } from '../../lib/runtime/feature-manager';
import { getCourseContentConfig } from '../../lib/runtime/feature-configs';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/contents/index/*'],
  runAt: 'document_idle',
  async main(ctx) {
    const config = await getCourseContentConfig();

    const manager = new FeatureManager({
      env: 'content',
      features: config.features,
      contentScriptCtx: ctx,
    });

    void manager.start();
  },
});

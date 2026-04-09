import { FeatureManager } from '../../lib/runtime/feature-manager';
import { getGradebookAttemptConfig } from '../../lib/runtime/feature-configs';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/gradebook/attempts/view/*/*'],
  runAt: 'document_idle',
  async main(ctx) {
    const config = await getGradebookAttemptConfig();

    const manager = new FeatureManager({
      env: 'content',
      features: config.features,
      contentScriptCtx: ctx,
    });

    void manager.start();
  },
});

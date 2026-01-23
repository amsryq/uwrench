import { FeatureManager } from '../../lib/runtime/feature-manager';
import { getGradebookAttemptConfig } from '../../lib/runtime/feature-configs';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/gradebook/attempts/view/*/*'],
  runAt: 'document_start',
  async main() {
    const config = await getGradebookAttemptConfig();

    const manager = new FeatureManager({
      env: 'content',
      features: config.features,
    });

    void manager.start();
  },
});

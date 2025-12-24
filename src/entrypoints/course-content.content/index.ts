import { FeatureManager } from '../../lib/runtime/feature-manager';
import { getCourseContentConfig } from '../../lib/runtime/feature-configs';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/contents/index/*'],
  runAt: 'document_start',
  async main() {
    const config = await getCourseContentConfig();

    const manager = new FeatureManager({
      env: 'content',
      features: config.features,
    });

    void manager.start();
  },
});

import { FeatureManager } from '../../lib/runtime/feature-manager';
import { getCourseListConfig } from '../../lib/runtime/feature-configs';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/courses/list_course'],
  runAt: 'document_idle',
  async main(ctx) {
    const config = await getCourseListConfig();

    const manager = new FeatureManager({
      env: 'content',
      features: config.features,
      contentScriptCtx: ctx,
    });

    void manager.start();
  },
});

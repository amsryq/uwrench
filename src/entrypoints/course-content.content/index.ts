import { FeatureManager } from '../../lib/runtime/feature-manager';
import { folderPasswordFeature } from '../../lib/features/folder-password';
import { folderPinningFeature } from '../../lib/features/folder-pinning';
import { quickLinksFeature } from '../../lib/features/quick-links';
import { ContentTableActionsRegistry } from '../../lib/registries/content-table-actions-registry';
import { mountCourseContentTableActions } from '../content/patches/course-content-table-actions';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/contents/index/*'],
  runAt: 'document_idle',
  async main(ctx) {
    const actionsRegistry = new ContentTableActionsRegistry();
    const stopActionsUi = mountCourseContentTableActions(actionsRegistry);

    const manager = new FeatureManager({
      features: [
        { feature: folderPasswordFeature },
        { feature: folderPinningFeature, context: { registries: { contentTableActions: actionsRegistry } } },
        { feature: quickLinksFeature, context: { registries: { contentTableActions: actionsRegistry } } },
      ],
      contentScriptCtx: ctx,
      extraCleanups: [stopActionsUi],
    });

    void manager.start();
  },
});

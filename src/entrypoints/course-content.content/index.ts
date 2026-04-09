import { folderPasswordFeature } from '../../lib/features/folder-password';
import { folderPinningFeature } from '../../lib/features/folder-pinning';
import { quickLinksFeature } from '../../lib/features/quick-links';
import { ContentTableActionsRegistry } from '../../lib/registries/content-table-actions-registry';
import { defineFeatureContentScript } from '../content/define-feature-content-script';
import { mountCourseContentTableActions } from '../content/patches/course-content-table-actions';

export default defineFeatureContentScript({
  matches: ['*://ufuture.uitm.edu.my/contents/index/*'],
  setup() {
    const actionsRegistry = new ContentTableActionsRegistry();
    const stopActionsUi = mountCourseContentTableActions(actionsRegistry);

    return {
      features: [
        { feature: folderPasswordFeature },
        { feature: folderPinningFeature, context: { registries: { contentTableActions: actionsRegistry } } },
        { feature: quickLinksFeature, context: { registries: { contentTableActions: actionsRegistry } } },
      ],
      extraCleanups: [stopActionsUi],
    };
  },
});

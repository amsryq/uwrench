import { FeatureManager } from '../../lib/runtime/feature-manager';
import { onlineClassListFeature } from '../../lib/features/online-class-list';
import { quickLinksFeature } from '../../lib/features/quick-links';
import { CourseListPanelsRegistry } from '../../lib/registries/course-list-panels-registry';
import { mountCourseListPanels } from '../content/patches/course-list-panels';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/courses/list_course'],
  runAt: 'document_idle',
  async main(ctx) {
    const panelsRegistry = new CourseListPanelsRegistry();
    const stopPanelsUi = mountCourseListPanels(panelsRegistry);

    const manager = new FeatureManager({
      features: [
        { feature: onlineClassListFeature, context: { registries: { courseListPanels: panelsRegistry } } },
        { feature: quickLinksFeature, context: { registries: { courseListPanels: panelsRegistry } } },
      ],
      contentScriptCtx: ctx,
      extraCleanups: [stopPanelsUi],
    });

    void manager.start();
  },
});

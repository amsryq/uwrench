import { onlineClassListFeature } from '../../lib/features/online-class-list';
import { quickLinksFeature } from '../../lib/features/quick-links';
import { CourseListPanelsRegistry } from '../../lib/registries/course-list-panels-registry';
import { defineFeatureContentScript } from '../content/define-feature-content-script';
import { mountCourseListPanels } from '../content/patches/course-list-panels';

export default defineFeatureContentScript({
  matches: ['*://ufuture.uitm.edu.my/courses/list_course'],
  setup() {
    const panelsRegistry = new CourseListPanelsRegistry();
    const stopPanelsUi = mountCourseListPanels(panelsRegistry);

    return {
      features: [
        { feature: onlineClassListFeature, context: { registries: { courseListPanels: panelsRegistry } } },
        { feature: quickLinksFeature, context: { registries: { courseListPanels: panelsRegistry } } },
      ],
      extraCleanups: [stopPanelsUi],
    };
  },
});

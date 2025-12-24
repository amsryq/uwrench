import { FeatureManager } from '../../lib/runtime/feature-manager';
import { courseContentTableActionsPatch } from './patches/course-content-table-actions';
import { courseListPanelsPatch } from './patches/course-list-panels';
import { streamerModeFeature } from '../../lib/features/streamer-mode';
import { folderPinningFeature } from '../../lib/features/folder-pinning';
import { quickLinksFeature } from '../../lib/features/quick-links';
import { onlineClassListFeature } from '../../lib/features/online-class-list';
import { folderPasswordFeature } from '../../lib/features/folder-password';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    const manager = new FeatureManager({
      env: 'content',
      patches: [courseContentTableActionsPatch, courseListPanelsPatch],
      features: [
        streamerModeFeature,
        folderPasswordFeature,
        folderPinningFeature,
        quickLinksFeature,
        onlineClassListFeature,
      ],
    });

    void manager.start();
  },
});

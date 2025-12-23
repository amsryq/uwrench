import { setupStreamerMode } from '../../lib/features/streamer-mode';
import { setupCourseContentTableActions } from './patches/course-content-table-actions';
import { setupCourseContentFolderPassword } from './patches/course-content-folder-password';
import { setupCourseListPanels } from './patches/course-list-panels';
import { registerOnlineClassesPanel } from '../../lib/features/online-class-list';
import { registerQuickLinksPanel } from '../../lib/features/quick-links/quick-links-list';
import { registerFolderPinningAction } from '../../lib/features/folder-pinning';
import { registerQuickLinksAction } from '../../lib/features/quick-links';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    // Patches
    setupCourseContentTableActions();
    setupCourseContentFolderPassword();
    setupCourseListPanels();

    // Features
    setupStreamerMode();
    registerFolderPinningAction();
    registerQuickLinksPanel();
    registerOnlineClassesPanel();
    registerQuickLinksAction();
  },
});

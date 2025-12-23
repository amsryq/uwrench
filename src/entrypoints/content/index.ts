import { setupStreamerMode } from '../../lib/features/streamer-mode';
import { setupCourseContentTableActions } from './patches/course-content-table-actions';
import { setupCourseContentFolderPassword } from './patches/course-content-folder-password';
import { setupCourseListQuickLinks } from './patches/course-list-quick-links';
import { registerFolderPinningAction } from '../../lib/features/folder-pinning';
import { registerQuickLinksAction } from '../../lib/features/quick-links';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    // Patches
    setupCourseContentTableActions();
    setupCourseContentFolderPassword();
    setupCourseListQuickLinks();

    // Features
    setupStreamerMode();
    registerFolderPinningAction();
    registerQuickLinksAction();
  },
});

import { setupPfpRemoval } from '../../lib/features/pfp-removal';
import { setupCourseContentTableActions } from './patches/course-content-table-actions';
import { registerFolderPinningAction } from '../../lib/features/folder-pinning';
import { registerQuickLinksAction } from '../../lib/features/quick-links';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    // Patches
    setupCourseContentTableActions();

    // Features
    setupPfpRemoval();
    registerFolderPinningAction();
    registerQuickLinksAction();
  },
});

import { setupPfpRemoval } from './pfp-removal';
import { setupFolderPinning } from './folder-pinning';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    setupPfpRemoval();
    setupFolderPinning();
  },
});

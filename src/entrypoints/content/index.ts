import { setupPfpRemoval } from './pfp-removal';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    setupPfpRemoval();
  },
});

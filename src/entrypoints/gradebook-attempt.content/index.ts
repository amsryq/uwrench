import { FeatureManager } from '../../lib/runtime/feature-manager';
import { gradebookCopyFeature } from '../../lib/features/gradebook-copy';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/gradebook/attempts/view/*/*'],
  runAt: 'document_idle',
  async main(ctx) {
    const manager = new FeatureManager({
      features: [{ feature: gradebookCopyFeature }],
      contentScriptCtx: ctx,
    });

    void manager.start();
  },
});

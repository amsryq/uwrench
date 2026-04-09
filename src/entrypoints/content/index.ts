import { FeatureManager } from '../../lib/runtime/feature-manager';
import { streamerModeFeature } from '../../lib/features/streamer-mode';

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: 'document_idle',
  async main(ctx) {
    const manager = new FeatureManager({
      features: [{ feature: streamerModeFeature }],
      contentScriptCtx: ctx,
    });

    void manager.start();
  },
});

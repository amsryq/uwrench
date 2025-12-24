import { FeatureManager } from '../../lib/runtime/feature-manager';
import { loginRedirectFeature } from '../../lib/features/login-redirect';

export default defineBackground(() => {
  const manager = new FeatureManager({
    env: 'background',
    patches: [],
    features: [loginRedirectFeature],
  });

  void manager.start();
});


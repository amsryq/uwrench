import type { FeatureDef } from '../runtime/types';

import { streamerModeFeature } from './streamer-mode';
import { folderPasswordFeature } from './folder-password';
import { folderPinningFeature } from './folder-pinning';
import { quickLinksFeature } from './quick-links';
import { onlineClassListFeature } from './online-class-list';
import { loginRedirectFeature } from './login-redirect';

export const allFeatures: Array<FeatureDef<any, any, any>> = [
  streamerModeFeature,
  folderPasswordFeature,
  folderPinningFeature,
  quickLinksFeature,
  onlineClassListFeature,
  loginRedirectFeature,
];

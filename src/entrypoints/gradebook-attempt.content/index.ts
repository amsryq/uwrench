import { gradebookCopyFeature } from '../../lib/features/gradebook-copy';
import { defineFeatureContentScript } from '../content/define-feature-content-script';

export default defineFeatureContentScript({
  matches: ['*://ufuture.uitm.edu.my/gradebook/attempts/view/*/*'],
  features: [{ feature: gradebookCopyFeature }],
});

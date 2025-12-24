import type { FeatureDef } from './types';

export type { FeatureManagerConfig } from './feature-manager';

/**
 * Features and patches that apply globally (all pages).
 */
export async function getGlobalConfig() {
  const [{ streamerModeFeature }] = await Promise.all([
    import('../features/streamer-mode'),
  ]);

  return {
    features: [streamerModeFeature] as FeatureDef[],
  };
}

/**
 * Features and patches for the course content page (/contents/index/*).
 */
export async function getCourseContentConfig() {
  const [{ folderPasswordFeature }, { folderPinningFeature }, { quickLinksFeature }] = await Promise.all([
    import('../features/folder-password'),
    import('../features/folder-pinning'),
    import('../features/quick-links'),
  ]);

  return {
    features: [
      folderPasswordFeature,
      folderPinningFeature,
      quickLinksFeature,
    ] as FeatureDef[],
  };
}

/**
 * Features and patches for the course list page (/courses/list_course).
 */
export async function getCourseListConfig() {
  const [{ onlineClassListFeature }, { quickLinksFeature }] = await Promise.all([
    import('../features/online-class-list'),
    import('../features/quick-links'),
  ]);

  return {
    features: [
      onlineClassListFeature,
      quickLinksFeature,
    ] as FeatureDef[],
  };
}

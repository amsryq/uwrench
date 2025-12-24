import type { PatchDef, PatchId } from './types';

export type PatchLoader = (patchId: PatchId) => Promise<PatchDef<any> | undefined>;

export function createContentPatchLoader(): PatchLoader {
  return async (patchId) => {
    switch (patchId) {
      case 'courseContentTableActions':
        return (await import('../../entrypoints/content/patches/course-content-table-actions'))
          .courseContentTableActionsPatch;
      case 'courseListPanels':
        return (await import('../../entrypoints/content/patches/course-list-panels')).courseListPanelsPatch;
      default:
        return undefined;
    }
  };
}

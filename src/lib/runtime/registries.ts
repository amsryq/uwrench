import { ContentTableActionsRegistry } from '../registries/content-table-actions-registry';
import { CourseListPanelsRegistry } from '../registries/course-list-panels-registry';

export type RuntimeRegistries = {
  contentTableActions?: ContentTableActionsRegistry;
  courseListPanels?: CourseListPanelsRegistry;
};

export type RegistryId = keyof RuntimeRegistries;

export function createRegistries(): RuntimeRegistries {
  return {};
}

export function ensureRegistry(
  registries: RuntimeRegistries,
  id: 'contentTableActions',
): ContentTableActionsRegistry;
export function ensureRegistry(registries: RuntimeRegistries, id: 'courseListPanels'): CourseListPanelsRegistry;
export function ensureRegistry(
  registries: RuntimeRegistries,
  id: keyof RuntimeRegistries,
): NonNullable<RuntimeRegistries[typeof id]> {
  if (id === 'contentTableActions') {
    registries.contentTableActions ??= new ContentTableActionsRegistry();
    return registries.contentTableActions as NonNullable<RuntimeRegistries[typeof id]>;
  }

  if (id === 'courseListPanels') {
    registries.courseListPanels ??= new CourseListPanelsRegistry();
    return registries.courseListPanels as NonNullable<RuntimeRegistries[typeof id]>;
  }

  throw new Error(`Unknown registry: ${String(id)}`);
}

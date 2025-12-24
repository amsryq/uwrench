import { waitForElement } from '../../../lib/utils/wait-for-element';
import {
  type CourseListPanel,
  type CourseListPanelApi,
  type CourseListPanelUpdateContext,
} from '../../../lib/registries/course-list-panels-registry';
import type { CourseListPanelsRegistry } from '../../../lib/registries/course-list-panels-registry';
import type { PatchDef } from '../../../lib/runtime/types';

const PANEL_ATTR = 'data-uw-course-list-panel';

let cleanupHandlers: Array<() => void> = [];

let refreshHandleImpl: (() => Promise<void>) | null = null;

export const courseListPanelsPatch: PatchDef<{ courseListPanels?: CourseListPanelsRegistry }> = {
  id: 'courseListPanels',
  registries: ['courseListPanels'],
  setup: ({ registries }) => {
    const registry = registries.courseListPanels;
    if (!registry) return { cleanup: undefined, handle: undefined };

    if (window.location.pathname !== '/courses/list_course') return { cleanup: undefined, handle: undefined };

    void (async () => {
      const container = await waitForElement('.content-page .content .container-fluid');
      if (!container) return;

      const titleRow = container.querySelector('.page-title-box')?.closest('.row') ?? null;

      const refresh = async () => {
        await update(container, titleRow, refresh, registry);
      };

      await refresh();

      const handlePageShow = () => {
        void refresh();
      };

      const handleVisibility = () => {
        if (!document.hidden) void refresh();
      };

      window.addEventListener('pageshow', handlePageShow);
      document.addEventListener('visibilitychange', handleVisibility);
      cleanupHandlers.push(() => window.removeEventListener('pageshow', handlePageShow));
      cleanupHandlers.push(() => document.removeEventListener('visibilitychange', handleVisibility));

      refreshHandleImpl = async () => {
        await refresh();
      };
    })();

    return {
      handle: { id: 'courseListPanels', refresh: async () => {
        await refreshHandleImpl?.();
      } },
      cleanup: () => {
        for (const fn of cleanupHandlers.splice(0)) fn();
        refreshHandleImpl = null;
        removeAllPanels();
      },
    };
  },
};

async function update(
  container: Element,
  titleRow: Element | null,
  refresh: () => Promise<void>,
  registry: CourseListPanelsRegistry,
) {
  const panels = registry.list();
  if (panels.length === 0) {
    removeAllPanels();
    return;
  }

  const updateCtx: CourseListPanelUpdateContext = {
    container,
    titleRow,
    url: window.location.href,
  };

  const api: CourseListPanelApi = {
    refresh: async () => {
      await refresh();
    },
  };

  const preparedByPanel = await preparePanels(panels, updateCtx);

  removeAllPanels();

  const parent = titleRow?.parentElement ?? container;
  const insertionRef = titleRow?.parentElement ? titleRow.nextSibling : parent.firstChild;

  for (const panel of panels) {
    const prepared = preparedByPanel.get(panel.name);
    const root = await panel.render(updateCtx, prepared as never, api);
    if (!root) continue;

    root.setAttribute(PANEL_ATTR, panel.name);
    parent.insertBefore(root, insertionRef);
  }

  for (const panel of panels) {
    const prepared = preparedByPanel.get(panel.name);
    await panel.postUpdate?.(updateCtx, prepared as never, api);
  }
}

function removeAllPanels() {
  document.querySelectorAll(`[${PANEL_ATTR}]`).forEach((el) => el.remove());
}

async function preparePanels(panels: CourseListPanel[], updateCtx: CourseListPanelUpdateContext) {
  const preparedByName = new Map<string, unknown>();

  for (const panel of panels) {
    if (!panel.prepare) {
      preparedByName.set(panel.name, undefined);
      continue;
    }

    preparedByName.set(panel.name, await panel.prepare(updateCtx));
  }

  return preparedByName;
}

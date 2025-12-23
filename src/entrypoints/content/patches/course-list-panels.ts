import { waitForElement } from '../../../lib/utils/wait-for-element';
import {
  courseListPanelsRegistry,
  type CourseListPanel,
  type CourseListPanelApi,
  type CourseListPanelUpdateContext,
} from '../../../lib/registries/course-list-panels-registry';

let started = false;

const PANEL_ATTR = 'data-uw-course-list-panel';

export async function setupCourseListPanels() {
  if (started) return;
  started = true;

  if (window.location.pathname !== '/courses/list_course') return;

  const container = await waitForElement('.content-page .content .container-fluid');
  if (!container) return;

  const titleRow = container.querySelector('.page-title-box')?.closest('.row') ?? null;

  const refresh = async () => {
    await update(container, titleRow, refresh);
  };

  await refresh();

  // Re-render when the user returns to this tab (e.g. after adding links elsewhere).
  window.addEventListener('pageshow', () => {
    void refresh();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh();
  });
}

async function update(
  container: Element,
  titleRow: Element | null,
  refresh: () => Promise<void>,
) {
  const panels = courseListPanelsRegistry.list();
  if (panels.length === 0) return;

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

  for (const panel of panels) {
    document
      .querySelectorAll(`[${PANEL_ATTR}="${CSS.escape(panel.name)}"]`)
      .forEach((el) => el.remove());
  }

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

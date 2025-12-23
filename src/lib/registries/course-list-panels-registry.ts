export type CourseListPanelApi = {
  refresh: () => Promise<void>;
};

export type CourseListPanelUpdateContext = {
  container: Element;
  titleRow: Element | null;
  url: string;
};

export type CourseListPanel<Prepared = any> = {
  /** Unique panel name, used for dedupe and DOM tagging. */
  name: string;

  /**
   * Called once per refresh cycle. Use this to load storage once and cache.
   * Return value is passed to render/postUpdate.
   */
  prepare?: (updateCtx: CourseListPanelUpdateContext) => Promise<Prepared> | Prepared;

  /** Render and return the panel root element (typically a `.row`). */
  render: (
    updateCtx: CourseListPanelUpdateContext,
    prepared: Prepared,
    api: CourseListPanelApi,
  ) => Promise<HTMLElement | null> | HTMLElement | null;

  /** Optional hook after all panels have been rendered/inserted. */
  postUpdate?: (
    updateCtx: CourseListPanelUpdateContext,
    prepared: Prepared,
    api: CourseListPanelApi,
  ) => Promise<void> | void;
};

export class CourseListPanelsRegistry {
  private panels: CourseListPanel[] = [];

  add<Prepared>(panel: CourseListPanel<Prepared>) {
    const existingIndex = this.panels.findIndex((p) => p.name === panel.name);
    if (existingIndex >= 0) {
      this.panels[existingIndex] = panel as CourseListPanel;
      return;
    }

    this.panels.push(panel as CourseListPanel);
  }

  list(): CourseListPanel[] {
    return [...this.panels];
  }

  clear() {
    this.panels = [];
  }
}

export const courseListPanelsRegistry = new CourseListPanelsRegistry();

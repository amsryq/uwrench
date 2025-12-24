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
  private panelsByName = new Map<string, { token: symbol; panel: CourseListPanel }>();

  register<Prepared>(panel: CourseListPanel<Prepared>): () => void {
    const token = Symbol(panel.name);
    this.panelsByName.set(panel.name, { token, panel: panel as CourseListPanel });

    return () => {
      const current = this.panelsByName.get(panel.name);
      if (!current) return;
      if (current.token !== token) return;
      this.panelsByName.delete(panel.name);
    };
  }

  add<Prepared>(panel: CourseListPanel<Prepared>) {
    this.panelsByName.set(panel.name, { token: Symbol(panel.name), panel: panel as CourseListPanel });
  }

  list(): CourseListPanel[] {
    return [...this.panelsByName.values()].map((v) => v.panel);
  }

  clear() {
    this.panelsByName.clear();
  }
}

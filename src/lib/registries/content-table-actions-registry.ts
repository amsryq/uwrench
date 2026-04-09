export type ContentTableActionContext = {
  row: HTMLTableRowElement;
  link: HTMLAnchorElement;
  href: string;

  /** Shared "Actions" cell for this row. */
  actionsCell: HTMLTableCellElement;

  /** The button element for the currently-rendering action. */
  button: HTMLButtonElement;
};

export type ContentTableActionApi = {
  refresh: () => Promise<void>;
};

export type ContentTableUpdateContext = {
  tbody: Element;
  rows: HTMLTableRowElement[];
  url: string;
};

export type ContentTableAction<Prepared = any> = {
  /** Unique action name, used for CSS class names and dedupe. */
  name: string;

  /** Label used for tooltips and accessibility. */
  headerText: string;

  /** Optional width hint (not currently used when actions share one column). */
  headerWidth?: string;

  /** FontAwesome/Bootstrap icon class for the default button icon. */
  iconClass: string;

  /**
   * Called once per table update. Use this to load storage once and cache.
   * Return value is passed to render/click/postUpdate.
   */
  prepare?: (updateCtx: ContentTableUpdateContext) => Promise<Prepared> | Prepared;

  /** Render/refresh the row UI state for this action. */
  render: (
    ctx: ContentTableActionContext,
    prepared: Prepared,
    api: ContentTableActionApi,
  ) => Promise<void> | void;

  /** Optional hook after all rows have been processed (e.g. sorting). */
  postUpdate?: (
    updateCtx: ContentTableUpdateContext,
    prepared: Prepared,
    api: ContentTableActionApi,
  ) => Promise<void> | void;
};

export class ContentTableActionsRegistry {
  private actionsByName = new Map<string, { token: symbol; action: ContentTableAction }>();
  private listeners = new Set<() => void>();

  private emit() {
    for (const listener of this.listeners) listener();
  }

  register<Prepared>(action: ContentTableAction<Prepared>): () => void {
    const token = Symbol(action.name);
    this.actionsByName.set(action.name, { token, action: action as ContentTableAction });
    this.emit();

    return () => {
      const current = this.actionsByName.get(action.name);
      if (!current) return;
      if (current.token !== token) return;
      this.actionsByName.delete(action.name);
      this.emit();
    };
  }

  add<Prepared>(action: ContentTableAction<Prepared>) {
    this.actionsByName.set(action.name, {
      token: Symbol(action.name),
      action: action as ContentTableAction,
    });
    this.emit();
  }

  list(): ContentTableAction[] {
    return [...this.actionsByName.values()].map((v) => v.action);
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear() {
    if (this.actionsByName.size === 0) return;
    this.actionsByName.clear();
    this.emit();
  }
}

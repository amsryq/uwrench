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
  private actions: ContentTableAction[] = [];

  add<Prepared>(action: ContentTableAction<Prepared>) {
    const existingIndex = this.actions.findIndex((a) => a.name === action.name);
    if (existingIndex >= 0) {
      this.actions[existingIndex] = action as ContentTableAction;
      return;
    }

    this.actions.push(action as ContentTableAction);
  }

  list(): ContentTableAction[] {
    return [...this.actions];
  }

  clear() {
    this.actions = [];
  }
}

export const contentTableActionsRegistry = new ContentTableActionsRegistry();

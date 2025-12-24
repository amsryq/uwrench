import { waitForElement } from '../../../lib/utils/wait-for-element';
import {
  type ContentTableAction,
  type ContentTableActionApi,
  type ContentTableActionContext,
  type ContentTableUpdateContext,
} from '../../../lib/registries/content-table-actions-registry';
import type { ContentTableActionsRegistry } from '../../../lib/registries/content-table-actions-registry';
import type { PatchDef } from '../../../lib/runtime/types';

let tableObserver: MutationObserver | null = null;
let lastTable: HTMLTableElement | null = null;

const ACTIONS_HEADER_CLASS = 'uw-actions-header';
const ACTIONS_CELL_CLASS = 'uw-actions-cell';
const ACTION_BUTTON_ATTR = 'data-uw-action';

let refreshHandleImpl: (() => void | Promise<void>) | null = null;

export const courseContentTableActionsPatch: PatchDef<{ contentTableActions?: ContentTableActionsRegistry }> = {
  id: 'courseContentTableActions',
  registries: ['contentTableActions'],
  setup: ({ registries }) => {
    const registry = registries.contentTableActions;
    if (!registry) {
      return { cleanup: undefined, handle: undefined };
    }

    if (!window.location.href.includes('/contents/index/')) return { cleanup: undefined, handle: undefined };

    void (async () => {
      const table = await waitForElement('#bs-table');
      if (!table) return;

      lastTable = table as HTMLTableElement;
      const refresh = await init(lastTable, registry);
      refreshHandleImpl = async () => {
        await refresh?.();
      };
    })();

    return {
      handle: {
        id: 'courseContentTableActions',
        refresh: async () => {
          await refreshHandleImpl?.();
        },
      },
      cleanup: () => {
        tableObserver?.disconnect();
        tableObserver = null;
        refreshHandleImpl = null;

        if (lastTable) {
          removeActionsUi(lastTable);
          lastTable = null;
        }
      },
    };
  },
};

async function init(table: HTMLTableElement, registry: ContentTableActionsRegistry) {
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const refresh = async (resetIndices = false) => {
    await updateTable(tbody, resetIndices, refresh, registry);
  };

  await refresh(false);

  tableObserver = new MutationObserver(async () => {
    if (tableObserver) tableObserver.disconnect();
    await refresh(true);
    if (tableObserver) tableObserver.observe(tbody, { childList: true });
  });

  tableObserver.observe(tbody, { childList: true });

  return async () => {
    if (tableObserver) tableObserver.disconnect();
    await refresh(false);
    if (tableObserver) tableObserver.observe(tbody, { childList: true });
  };
}

async function updateTable(
  tbody: Element,
  resetIndices: boolean,
  refresh: (resetIndices?: boolean) => Promise<void>,
  registry: ContentTableActionsRegistry,
) {
  const actions = registry.list();
  if (actions.length === 0) {
    const table = tbody.closest('table') as HTMLTableElement | null;
    if (table) removeActionsUi(table);
    return;
  }

  const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];

  const updateCtx: ContentTableUpdateContext = {
    tbody,
    rows,
    url: window.location.href,
  };

  const api: ContentTableActionApi = {
    refresh: async () => {
      if (tableObserver) tableObserver.disconnect();
      await refresh(false);
      if (tableObserver) tableObserver.observe(tbody, { childList: true });
    },
  };

  const preparedByAction = await prepareActions(actions, updateCtx);

  let maxBaseCols = getMaxBaseColumns(rows, actions);

  const table = tbody.closest('table');
  const theadRow = table?.querySelector('thead tr') as HTMLTableRowElement | null;
  if (theadRow) {
    ensureActionsHeader(theadRow);
    maxBaseCols = theadRow.cells.length - 1;
  }

  rows.forEach((row, index) => {
    if (resetIndices || !row.dataset.originalIndex) {
      row.dataset.originalIndex = index.toString();
    }
    const actionsCell = ensureActionsCell(row);
    ensureRowBaseColumns(row, maxBaseCols, actionsCell);

    const link = row.querySelector('td a') as HTMLAnchorElement | null;
    const href = link?.getAttribute('href') ?? '';
    if (!link || !href) return;

    for (const action of actions) {
      const prepared = preparedByAction.get(action.name);

      const button = ensureActionButton(actionsCell, action, actions);

      const ctx: ContentTableActionContext = {
        row,
        link,
        href,
        actionsCell,
        button,
      };

      renderActionButton(action, ctx, prepared, api);
    }

    reconcileRowButtons(actionsCell, actions);
  });

  for (const action of actions) {
    const prepared = preparedByAction.get(action.name);
    await action.postUpdate?.(updateCtx, prepared, api);
  }
}

function reconcileRowButtons(actionsCell: HTMLTableCellElement, actionsInOrder: ContentTableAction[]) {
  const allowed = new Set(actionsInOrder.map((a) => a.name));
  const buttons = Array.from(
    actionsCell.querySelectorAll(`button[${ACTION_BUTTON_ATTR}]`),
  ) as HTMLButtonElement[];

  for (const btn of buttons) {
    const name = btn.getAttribute(ACTION_BUTTON_ATTR) ?? '';
    if (!allowed.has(name)) btn.remove();
  }
}

async function prepareActions(
  actions: ContentTableAction[],
  updateCtx: ContentTableUpdateContext,
) {
  const preparedByName = new Map<string, unknown>();

  for (const action of actions) {
    if (!action.prepare) {
      preparedByName.set(action.name, undefined);
      continue;
    }

    preparedByName.set(action.name, await action.prepare(updateCtx));
  }

  return preparedByName;
}

function getMaxBaseColumns(rows: HTMLTableRowElement[], actions: ContentTableAction[]) {
  let max = 0;

  for (const row of rows) {
    const baseCount = row.cells.length - 1;
    if (baseCount > max) max = baseCount;
  }

  return max;
}

function ensureActionsHeader(theadRow: HTMLTableRowElement) {
  const existing = theadRow.querySelector(`th.${ACTIONS_HEADER_CLASS}`);
  if (existing) return;

  const th = document.createElement('th');
  th.className = `text-center ${ACTIONS_HEADER_CLASS}`;
  th.textContent = 'Actions';
  theadRow.appendChild(th);
}

function removeActionsUi(table: HTMLTableElement) {
  const theadRow = table.querySelector('thead tr') as HTMLTableRowElement | null;
  theadRow?.querySelectorAll(`th.${ACTIONS_HEADER_CLASS}`).forEach((th) => th.remove());

  const rows = Array.from(table.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
  for (const row of rows) {
    row.querySelectorAll(`td.${ACTIONS_CELL_CLASS}`).forEach((td) => td.remove());
    delete row.dataset.pinned;
    if (row.style.backgroundColor) row.style.backgroundColor = '';
  }
}

function ensureRowBaseColumns(
  row: HTMLTableRowElement,
  maxBaseCols: number,
  actionsCell: HTMLTableCellElement,
) {
  moveOverflowCellsAfterActions(row, actionsCell, maxBaseCols);

  let currentBaseCols = Array.from(row.cells).indexOf(actionsCell);
  while (currentBaseCols < maxBaseCols) {
    const td = document.createElement('td');
    td.className = 'text-center hidden-xs';

    row.insertBefore(td, actionsCell);

    currentBaseCols++;
  }
}

function moveOverflowCellsAfterActions(
  row: HTMLTableRowElement,
  actionsCell: HTMLTableCellElement,
  maxBaseCols: number,
) {
  const cells = Array.from(row.cells);
  const actionIndex = cells.indexOf(actionsCell);
  if (actionIndex < 0) return;

  const overflowCells = cells.slice(0, actionIndex).slice(maxBaseCols);
  for (const cell of overflowCells) {
    row.appendChild(cell);
  }
}

function renderActionButton(
  action: ContentTableAction,
  ctx: ContentTableActionContext,
  prepared: unknown,
  api: ContentTableActionApi,
) {
  // Default icon/state. Action.render can override fully.
  ctx.button.className = 'btn btn-xs btn-default';
  ctx.button.disabled = false;
  ctx.button.innerHTML = `<i class="${action.iconClass}"></i>`;
  ctx.button.title = action.headerText;
  ctx.button.style.cursor = 'pointer';

  action.render(ctx, prepared as never, api);
}

function ensureActionsCell(row: HTMLTableRowElement): HTMLTableCellElement {
  let cell = row.querySelector(`td.${ACTIONS_CELL_CLASS}`) as HTMLTableCellElement | null;
  if (!cell) {
    cell = document.createElement('td');
    cell.className = `text-center ${ACTIONS_CELL_CLASS}`;
    cell.style.display = 'flex';
    row.appendChild(cell);
  }
  return cell;
}

function ensureActionButton(
  actionsCell: HTMLTableCellElement,
  action: ContentTableAction,
  actionsInOrder: ContentTableAction[],
): HTMLButtonElement {
  const selector = `button[${ACTION_BUTTON_ATTR}="${CSS.escape(action.name)}"]`;
  let button = actionsCell.querySelector(selector) as HTMLButtonElement | null;
  if (button) return button;

  button = document.createElement('button');
  button.setAttribute(ACTION_BUTTON_ATTR, action.name);
  button.type = 'button';

  const insertionPoint = findNextActionButton(actionsCell, action, actionsInOrder);
  if (insertionPoint) actionsCell.insertBefore(button, insertionPoint);
  else actionsCell.appendChild(button);

  return button;
}

function findNextActionButton(
  actionsCell: HTMLTableCellElement,
  action: ContentTableAction,
  actionsInOrder: ContentTableAction[],
) {
  const index = actionsInOrder.findIndex((a) => a.name === action.name);
  const nextActions = index >= 0 ? actionsInOrder.slice(index + 1) : [];
  for (const next of nextActions) {
    const existing = actionsCell.querySelector(
      `button[${ACTION_BUTTON_ATTR}="${CSS.escape(next.name)}"]`,
    ) as HTMLButtonElement | null;
    if (existing) return existing;
  }
  return null;
}

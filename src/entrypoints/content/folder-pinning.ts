import { waitForElement } from "../../lib/utils/wait-for-element";

const PINNED_FOLDERS_KEY = 'local:pinned_folders';
let tableObserver: MutationObserver | null = null;

export async function setupFolderPinning() {
  if (!window.location.href.includes('/contents/index/')) {
    return;
  }

  const table = await waitForElement('#bs-table');
  if (!table) return;

  await initPinning(table as HTMLTableElement);
}

async function initPinning(table: HTMLTableElement) {
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  await updateTable(tbody);

  tableObserver = new MutationObserver(async () => {
    if (tableObserver) tableObserver.disconnect();
    await updateTable(tbody, true);
    if (tableObserver) tableObserver.observe(tbody, { childList: true });
  });

  tableObserver.observe(tbody, { childList: true });
}

async function updateTable(tbody: Element, resetIndices = false) {
  const pinnedFolders = (await storage.getItem<string[]>(PINNED_FOLDERS_KEY)) || [];
  const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLTableRowElement[];

  // 1. Find max columns (excluding our pin-action)
  let maxCols = 0;
  rows.forEach(row => {
    const pinCell = row.querySelector('.pin-action');
    const count = row.cells.length - (pinCell ? 1 : 0);
    if (count > maxCols) maxCols = count;
  });

  // 2. Fix header
  const table = tbody.closest('table');
  const theadRow = table?.querySelector('thead tr') as HTMLTableRowElement;
  if (theadRow) {
    const pinHeader = theadRow.querySelector('.pin-header');
    let currentCols = theadRow.cells.length - (pinHeader ? 1 : 0);
    
    while (currentCols < maxCols) {
      const th = document.createElement('th');
      th.className = 'text-center hidden-xs';
      if (pinHeader) {
        theadRow.insertBefore(th, pinHeader);
      } else {
        theadRow.appendChild(th);
      }
      currentCols++;
    }
    
    if (!theadRow.querySelector('.pin-header')) {
      const th = document.createElement('th');
      th.className = 'text-center pin-header';
      th.style.width = '5%';
      th.textContent = 'Pin';
      theadRow.appendChild(th);
    }
  }

  // 3. Process rows
  rows.forEach((row, index) => {
    if (resetIndices || !row.dataset.originalIndex) {
      row.dataset.originalIndex = index.toString();
    }
    
    // Ensure row has maxCols before pin-action
    const pinCell = row.querySelector('.pin-action');
    let currentCols = row.cells.length - (pinCell ? 1 : 0);
    
    while (currentCols < maxCols) {
      const td = document.createElement('td');
      td.className = 'text-center hidden-xs';
      if (pinCell) {
        row.insertBefore(td, pinCell);
      } else {
        row.appendChild(td);
      }
      currentCols++;
    }

    processRow(row, pinnedFolders);
  });

  sortRows(tbody);
}

function processRow(row: HTMLTableRowElement, pinnedFolders: string[]) {
  // Find the unique ID.
  const link = row.querySelector('td a') as HTMLAnchorElement;
  if (!link) return;

  const id = link.getAttribute('href');
  if (!id) return;

  const isPinned = pinnedFolders.includes(id);

  // Update or create pin button
  let td = row.querySelector('.pin-action');
  let btn: HTMLButtonElement;

  if (!td) {
    td = document.createElement('td');
    td.className = 'text-center pin-action';
    btn = document.createElement('button');
    td.appendChild(btn);
    row.appendChild(td);
  } else {
    btn = td.querySelector('button') as HTMLButtonElement;
  }

  btn.className = 'btn btn-xs ' + (isPinned ? 'btn-warning' : 'btn-default');
  btn.innerHTML = '<i class="fa fa-thumb-tack"></i>';
  
  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await togglePin(id, btn, row);
  };

  if (isPinned) {
    row.dataset.pinned = 'true';
    row.style.backgroundColor = '#fffbe6';
  } else {
    row.dataset.pinned = 'false';
    row.style.backgroundColor = '';
  }
}

async function togglePin(id: string, btn: HTMLButtonElement, row: HTMLTableRowElement) {
  let pinnedFolders = (await storage.getItem<string[]>(PINNED_FOLDERS_KEY)) || [];
  
  const index = pinnedFolders.indexOf(id);
  if (index > -1) {
    pinnedFolders.splice(index, 1);
  } else {
    pinnedFolders.push(id);
  }

  await storage.setItem(PINNED_FOLDERS_KEY, pinnedFolders);
  
  const tbody = row.parentElement;
  if (tbody) {
    if (tableObserver) tableObserver.disconnect();
    await updateTable(tbody);
    if (tableObserver) tableObserver.observe(tbody, { childList: true });
  }
}

function sortRows(tbody: Element) {
  const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLElement[];
  
  rows.sort((a, b) => {
    const aPinned = a.dataset.pinned === 'true';
    const bPinned = b.dataset.pinned === 'true';

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    // If both are pinned or both are unpinned, use original index to maintain order
    const aIndex = Number.parseInt(a.dataset.originalIndex || '0');
    const bIndex = Number.parseInt(b.dataset.originalIndex || '0');
    return aIndex - bIndex;
  });

  rows.forEach(row => tbody.appendChild(row));
}

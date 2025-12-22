import { contentTableActionsRegistry } from '../registries/content-table-actions-registry';

const PINNED_FOLDERS_KEY = 'local:pinned_folders';

export function registerFolderPinningAction() {
  contentTableActionsRegistry.add({
    name: 'pin',
    headerText: 'Pin',
    headerWidth: '5%',
    iconClass: 'fa fa-thumb-tack',
    prepare: async () => {
      return (await storage.getItem<string[]>(PINNED_FOLDERS_KEY)) ?? [];
    },
    render: (ctx, pinnedFolders, api) => {
      const { row, href, button } = ctx;

      const isPinned = pinnedFolders.includes(href);

      button.className = `btn btn-xs ${isPinned ? 'btn-warning' : 'btn-default'}`;
      button.innerHTML = '<i class="fa fa-thumb-tack"></i>';
      button.title = isPinned ? 'Unpin' : 'Pin';

      button.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await togglePin(href);
        await api.refresh();
      };

      if (isPinned) {
        row.dataset.pinned = 'true';
        row.style.backgroundColor = '#fffbe6';
      } else {
        row.dataset.pinned = 'false';
        row.style.backgroundColor = '';
      }
    },
    postUpdate: ({ tbody }) => {
      sortRowsByPinned(tbody);
    },
  });
}

async function togglePin(href: string) {
  const pinnedFolders = (await storage.getItem<string[]>(PINNED_FOLDERS_KEY)) ?? [];

  const index = pinnedFolders.indexOf(href);
  if (index >= 0) pinnedFolders.splice(index, 1);
  else pinnedFolders.push(href);

  await storage.setItem(PINNED_FOLDERS_KEY, pinnedFolders);
}

function sortRowsByPinned(tbody: Element) {
  const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLElement[];

  rows.sort((a, b) => {
    const aPinned = a.dataset.pinned === 'true';
    const bPinned = b.dataset.pinned === 'true';

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    const aIndex = Number.parseInt(a.dataset.originalIndex || '0');
    const bIndex = Number.parseInt(b.dataset.originalIndex || '0');
    return aIndex - bIndex;
  });

  rows.forEach((row) => tbody.appendChild(row));
}

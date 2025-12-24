import type { FeatureDef } from '../runtime/types';
import type { ContentTableActionsRegistry } from '../registries/content-table-actions-registry';

const PINNED_FOLDERS_KEY = 'local:pinned_folders';

export const folderPinningFeature: FeatureDef = {
  id: 'folderPinning',
  title: 'Folder Pinning',
  description: 'Pin course content folders to the top.',
  defaults: { enabled: true, options: {} },
  dependsOnPatches: ['courseContentTableActions'],
  dependsOnRegistries: ['contentTableActions'],
  setup: async ({ registries }) => {
    const registry = registries.contentTableActions as ContentTableActionsRegistry | undefined;
    if (!registry) return {};

    const dispose = registry.register({
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

    return {
      cleanup: () => {
        dispose();
        // Remove any residual styling when the action is disabled but the patch remains.
        document
          .querySelectorAll('tbody tr[data-pinned]')
          .forEach((row) => {
            if (!(row instanceof HTMLElement)) return;
            delete row.dataset.pinned;
            row.style.backgroundColor = '';
          });
      },
    };
  },
  clearData: async () => {
    await storage.setItem(PINNED_FOLDERS_KEY, []);
  },
};

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

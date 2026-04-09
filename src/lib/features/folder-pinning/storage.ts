const pinnedFoldersItem = storage.defineItem<string[]>("local:pinned_folders", {
  fallback: [],
});

export async function getPinnedFolders(): Promise<string[]> {
  return await pinnedFoldersItem.getValue();
}

async function setPinnedFolders(hrefs: string[]): Promise<void> {
  await pinnedFoldersItem.setValue(hrefs);
}

async function updatePinnedFolders(
  updater: (hrefs: string[]) => string[] | Promise<string[]>,
): Promise<string[]> {
  const current = await getPinnedFolders();
  const next = await updater(current);
  await setPinnedFolders(next);
  return next;
}

export async function togglePinnedFolder(href: string): Promise<void> {
  await updatePinnedFolders((hrefs) => {
    const index = hrefs.indexOf(href);
    if (index < 0) return [...hrefs, href];
    return hrefs.filter((entry) => entry !== href);
  });
}

export async function clearPinnedFolders(): Promise<void> {
  await setPinnedFolders([]);
}

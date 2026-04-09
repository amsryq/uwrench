export type FolderPasswords = Record<string, string>;

const folderPasswordsItem = storage.defineItem<FolderPasswords>("session:folder_passwords", {
  fallback: {},
});

export async function getFolderPasswords(): Promise<FolderPasswords> {
  return await folderPasswordsItem.getValue();
}

async function setFolderPasswords(passwords: FolderPasswords): Promise<void> {
  await folderPasswordsItem.setValue(passwords);
}

async function updateFolderPasswords(
  updater: (passwords: FolderPasswords) => FolderPasswords | Promise<FolderPasswords>,
): Promise<FolderPasswords> {
  const current = await getFolderPasswords();
  const next = await updater(current);
  await setFolderPasswords(next);
  return next;
}

export async function getFolderPassword(folderKey: string): Promise<string | null> {
  const all = await getFolderPasswords();
  return all[folderKey] ?? null;
}

export async function setFolderPassword(folderKey: string, password: string): Promise<void> {
  await updateFolderPasswords((all) => ({
    ...all,
    [folderKey]: password,
  }));
}

export async function removeFolderPassword(folderKey: string): Promise<void> {
  await updateFolderPasswords((all) => {
    if (!(folderKey in all)) return all;

    const next = { ...all };
    delete next[folderKey];
    return next;
  });
}

export async function clearFolderPasswords(): Promise<void> {
  await setFolderPasswords({});
}

import { folderPasswordsItem } from "../../storage/items";

export type FolderPasswords = Record<string, string>;

export async function getFolderPasswords(): Promise<FolderPasswords> {
  return await folderPasswordsItem.getValue();
}

export async function getFolderPassword(folderKey: string): Promise<string | null> {
  const all = await getFolderPasswords();
  return all[folderKey] ?? null;
}

export async function setFolderPassword(folderKey: string, password: string): Promise<void> {
  const all = await getFolderPasswords();
  await folderPasswordsItem.setValue({
    ...all,
    [folderKey]: password,
  });
}

export async function removeFolderPassword(folderKey: string): Promise<void> {
  const all = await getFolderPasswords();
  if (!(folderKey in all)) return;
  const next = { ...all };
  delete next[folderKey];
  await folderPasswordsItem.setValue(next);
}

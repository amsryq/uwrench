const FOLDER_PASSWORDS_KEY = 'local:folder_passwords';

export type FolderPasswords = Record<string, string>;

export async function getFolderPasswords(): Promise<FolderPasswords> {
  return (await storage.getItem<FolderPasswords>(FOLDER_PASSWORDS_KEY)) ?? {};
}

export async function getFolderPassword(folderKey: string): Promise<string | null> {
  const all = await getFolderPasswords();
  return all[folderKey] ?? null;
}

export async function setFolderPassword(folderKey: string, password: string): Promise<void> {
  const all = await getFolderPasswords();
  all[folderKey] = password;
  await storage.setItem(FOLDER_PASSWORDS_KEY, all);
}

export async function removeFolderPassword(folderKey: string): Promise<void> {
  const all = await getFolderPasswords();
  if (!(folderKey in all)) return;
  delete all[folderKey];
  await storage.setItem(FOLDER_PASSWORDS_KEY, all);
}

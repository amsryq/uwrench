import { quickLinksItem } from "../../storage/items";

export type QuickLinkType = "course_content" | (string & {});

export type QuickLink = {
  type: QuickLinkType;
  icon: string;
  name: string;
  desc: string;
  href: string;
  addedAt?: string;
};

export async function getQuickLinks(): Promise<QuickLink[]> {
  return await quickLinksItem.getValue();
}

export async function addOrUpdateQuickLink(link: QuickLink): Promise<void> {
  const links = await getQuickLinks();

  const index = links.findIndex(
    (existing) => existing.type === link.type && existing.href === link.href,
  );

  if (index >= 0) {
    links[index] = { ...links[index], ...link };
  } else {
    links.push(link);
  }

  await quickLinksItem.setValue(links);
}

export async function removeQuickLink(type: QuickLinkType, href: string): Promise<void> {
  const links = await getQuickLinks();
  const filtered = links.filter((existing) => !(existing.type === type && existing.href === href));
  await quickLinksItem.setValue(filtered);
}

export function hasQuickLink(links: QuickLink[], type: QuickLinkType, href: string): boolean {
  return links.some((l) => l.type === type && l.href === href);
}

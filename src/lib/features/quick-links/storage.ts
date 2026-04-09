export type QuickLinkType = "course_content" | (string & {});

export type QuickLink = {
  type: QuickLinkType;
  icon: string;
  name: string;
  desc: string;
  href: string;
  addedAt?: string;
};

const quickLinksItem = storage.defineItem<QuickLink[]>("local:quick_links", {
  fallback: [],
});

export async function getQuickLinks(): Promise<QuickLink[]> {
  return await quickLinksItem.getValue();
}

async function setQuickLinks(links: QuickLink[]): Promise<void> {
  await quickLinksItem.setValue(links);
}

async function updateQuickLinks(
  updater: (links: QuickLink[]) => QuickLink[] | Promise<QuickLink[]>,
): Promise<QuickLink[]> {
  const current = await getQuickLinks();
  const next = await updater(current);
  await setQuickLinks(next);
  return next;
}

export async function addOrUpdateQuickLink(link: QuickLink): Promise<void> {
  await updateQuickLinks((links) => {
    const index = links.findIndex(
      (existing) => existing.type === link.type && existing.href === link.href,
    );

    if (index < 0) return [...links, link];

    const next = [...links];
    next[index] = { ...next[index], ...link };
    return next;
  });
}

export async function removeQuickLink(type: QuickLinkType, href: string): Promise<void> {
  await updateQuickLinks((links) =>
    links.filter((existing) => !(existing.type === type && existing.href === href)),
  );
}

export async function clearQuickLinks(): Promise<void> {
  await setQuickLinks([]);
}

export function hasQuickLink(links: QuickLink[], type: QuickLinkType, href: string): boolean {
  return links.some((l) => l.type === type && l.href === href);
}

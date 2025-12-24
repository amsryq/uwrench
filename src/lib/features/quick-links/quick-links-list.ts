import {
  type CourseListPanelApi,
} from '../../registries/course-list-panels-registry';
import type { CourseListPanelsRegistry } from '../../registries/course-list-panels-registry';
import {
  getQuickLinks,
  removeQuickLink,
  type QuickLink,
  type QuickLinkType,
} from './storage';

const ROOT_ID = 'uw-quick-links';
const MENU_ID = 'uw-quick-links-menu';
const PANEL_NAME = 'course-list-quick-links';

let menuApi: CourseListPanelApi | null = null;
let openMenu: ((x: number, y: number, type: QuickLinkType, href: string) => void) | null = null;
let closeMenu: (() => void) | null = null;

let menuCleanup: (() => void) | null = null;

export function setupQuickLinksPanel(registry: CourseListPanelsRegistry): () => void {
  const dispose = registry.register({
    name: PANEL_NAME,
    prepare: async () => {
      const links = await getQuickLinks();
      return links.filter((l) => l.type === 'course_content');
    },
    render: async (_updateCtx, courseContentLinks: QuickLink[], api) => {
      menuApi = api;
      menuCleanup ??= ensureContextMenuWired();
      return renderQuickLinks(courseContentLinks);
    },
  });

  return () => {
    dispose();
    document.getElementById(ROOT_ID)?.remove();
    menuCleanup?.();
    menuCleanup = null;
    menuApi = null;
    openMenu = null;
    closeMenu = null;
  };
}

async function renderQuickLinks(courseContentLinks: QuickLink[]): Promise<HTMLElement> {
  document.getElementById(ROOT_ID)?.remove();

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.className = 'row';

  const col = document.createElement('div');
  col.className = 'col-12';
  root.appendChild(col);

  const card = document.createElement('div');
  card.className = 'card-box';
  col.appendChild(card);

  const header = document.createElement('div');
  header.className = 'd-flex justify-content-between align-items-center';
  card.appendChild(header);

  const title = document.createElement('h5');
  title.className = 'm-0';
  title.textContent = 'Quick Links';
  header.appendChild(title);

  const count = document.createElement('small');
  count.className = 'text-muted';
  count.textContent = `${courseContentLinks.length}`;
  header.appendChild(count);

  const body = document.createElement('div');
  body.style.marginTop = '10px';
  card.appendChild(body);

  if (courseContentLinks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-muted';
    empty.textContent = 'No quick links yet. Add them from a course content page.';
    body.appendChild(empty);
    return root;
  }

  const sorted = [...courseContentLinks].sort((a, b) => {
    const aTime = a.addedAt ? Date.parse(a.addedAt) : 0;
    const bTime = b.addedAt ? Date.parse(b.addedAt) : 0;
    return bTime - aTime;
  });

  const scroller = document.createElement('div');
  scroller.className = 'd-flex flex-row flex-nowrap';
  scroller.style.overflowX = 'auto';
  scroller.style.overflowY = 'hidden';
  scroller.style.paddingBottom = '6px';
  body.appendChild(scroller);

  for (const link of sorted) {
    const wrapper = document.createElement('div');
    wrapper.style.minWidth = '260px';
    wrapper.style.maxWidth = '260px';
    wrapper.className = 'mr-2';

    const a = document.createElement('a');
    a.href = toAbsoluteHref(link.href);
    a.style.textDecoration = 'none';
    a.style.display = 'block';

    const item = document.createElement('div');
    item.className = 'card-box';
    item.style.padding = '12px';
    item.style.position = 'relative';
    a.appendChild(item);

    const topLine = document.createElement('div');
    topLine.className = 'd-flex align-items-center';
    item.appendChild(topLine);

    const icon = document.createElement('i');
    icon.className = link.icon || 'fa fa-link';
    icon.style.marginRight = '10px';
    topLine.appendChild(icon);

    const primary = document.createElement('div');
    primary.className = 'text-truncate';
    primary.style.fontWeight = '600';
    primary.style.maxWidth = '210px';
    primary.textContent = (link.desc || link.name || link.href).trim();
    topLine.appendChild(primary);

    const secondary = document.createElement('div');
    secondary.className = 'text-muted text-truncate';
    secondary.style.marginTop = '6px';
    secondary.style.maxWidth = '240px';
    secondary.textContent = link.desc ? (link.name || link.href).trim() : '';
    if (secondary.textContent) item.appendChild(secondary);

    wrapper.appendChild(a);

    const moreButton = document.createElement('button');
    moreButton.type = 'button';
    moreButton.className = 'btn btn-link text-muted';
    moreButton.style.position = 'absolute';
    moreButton.style.top = '8px';
    moreButton.style.right = '8px';
    moreButton.style.padding = '0';
    moreButton.style.fontSize = '1rem';
    moreButton.innerHTML = '<i class="fa fa-ellipsis-h"></i>';
    moreButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!openMenu) return;
      const rect = moreButton.getBoundingClientRect();
      openMenu(rect.left, rect.bottom, link.type, link.href);
    });

    item.appendChild(moreButton);
    scroller.appendChild(wrapper);
  }

  return root;
}

function ensureContextMenuWired() {
  const menu = ensureContextMenu();

  if (!closeMenu) {
    closeMenu = () => {
      menu.classList.remove('show');
      menu.style.display = 'none';
      delete menu.dataset.href;
      delete menu.dataset.type;
    };
  }

  if (!openMenu) {
    openMenu = (x: number, y: number, type: QuickLinkType, href: string) => {
      menu.dataset.type = type;
      menu.dataset.href = href;

      menu.style.display = 'block';
      menu.classList.add('show');

      const pad = 8;
      const maxLeft = Math.max(pad, window.innerWidth - menu.offsetWidth - pad);
      const maxTop = Math.max(pad, window.innerHeight - menu.offsetHeight - pad);
      menu.style.left = `${Math.min(Math.max(x, pad), maxLeft)}px`;
      menu.style.top = `${Math.min(Math.max(y, pad), maxTop)}px`;
    };
  }

  // Global close behaviors.
  const handleDocumentClick = (e: MouseEvent) => {
    if (!menu.classList.contains('show')) return;
    if (e.target instanceof Node && menu.contains(e.target)) return;
    closeMenu?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeMenu?.();
  };

  const handleScroll = () => closeMenu?.();
  const handleResize = () => closeMenu?.();

  document.addEventListener('click', handleDocumentClick, true);
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', handleResize);

  return () => {
    document.removeEventListener('click', handleDocumentClick, true);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('scroll', handleScroll, true);
    window.removeEventListener('resize', handleResize);
    document.getElementById(MENU_ID)?.remove();
  };
}

function ensureContextMenu(): HTMLDivElement {
  const existing = document.getElementById(MENU_ID) as HTMLDivElement | null;
  if (existing) return existing;

  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.className = 'dropdown-menu';
  menu.style.position = 'fixed';
  menu.style.zIndex = '2000';
  menu.style.display = 'none';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'dropdown-item';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const type = menu.dataset.type as QuickLinkType | undefined;
    const href = menu.dataset.href;
    if (!type || !href) return;

    await removeQuickLink(type, href);
    closeMenu?.();
    await menuApi?.refresh();
  });

  menu.appendChild(removeBtn);
  document.body.appendChild(menu);
  return menu;
}

function toAbsoluteHref(href: string): string {
  if (!href) return window.location.href;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${window.location.origin}${href}`;
  return new URL(href, window.location.href).toString();
}

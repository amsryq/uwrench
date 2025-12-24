import type { FeatureDef } from '../../runtime/types';
import type { ContentTableActionsRegistry } from '../../registries/content-table-actions-registry';
import type { CourseListPanelsRegistry } from '../../registries/course-list-panels-registry';
import {
  addOrUpdateQuickLink,
  removeQuickLink,
  getQuickLinks,
  hasQuickLink,
  type QuickLink,
} from './storage';
import { setupQuickLinksPanel } from './quick-links-list';

const QUICK_LINKS_KEY = 'local:quick_links';

export const quickLinksFeature: FeatureDef = {
  id: 'quickLinks',
  title: 'Quick Links',
  description: 'Save and access course content folders quickly.',
  defaults: { enabled: true, options: {} },
  dependsOnPatches: ['courseContentTableActions', 'courseListPanels'],
  dependsOnRegistries: ['contentTableActions', 'courseListPanels'],
  setup: async ({ registries }) => {
    const cleanups: Array<() => void> = [];

    const actionsRegistry = registries.contentTableActions as ContentTableActionsRegistry | undefined;
    if (actionsRegistry) {
      const dispose = actionsRegistry.register({
        name: 'quicklink',
        headerText: 'Quick',
        headerWidth: '5%',
        iconClass: 'fa fa-link',
        prepare: async () => {
          return await getQuickLinks();
        },
        render: (ctx, quickLinks, api) => {
          const { row, link, href, button } = ctx;

          const alreadyAdded = hasQuickLink(quickLinks, 'course_content', href);

          button.className = `btn btn-xs ${alreadyAdded ? 'btn-warning' : 'btn-default'}`;
          button.innerHTML = alreadyAdded
            ? '<i class="fa fa-trash"></i>'
            : '<i class="fa fa-link"></i>';
          button.title = alreadyAdded ? 'Remove quick access' : 'Add quick access';
          button.disabled = false;

          button.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (alreadyAdded) {
              await removeQuickLink('course_content', href);
            } else {
              const quickLink = buildCourseContentQuickLink(row, link, href);
              await addOrUpdateQuickLink(quickLink);
            }

            await api.refresh();
          };
        },
      });
      cleanups.push(dispose);
    }

    const panelsRegistry = registries.courseListPanels as CourseListPanelsRegistry | undefined;
    if (panelsRegistry) {
      const cleanup = setupQuickLinksPanel(panelsRegistry);
      cleanups.push(cleanup);
    }

    return {
      cleanup: () => {
        for (const fn of cleanups.splice(0).reverse()) fn();
      },
    };
  },
  clearData: async () => {
    await storage.setItem(QUICK_LINKS_KEY, []);
  },
};

function buildCourseContentQuickLink(
  row: HTMLTableRowElement,
  link: HTMLAnchorElement,
  href: string,
): QuickLink {
  const name = (link.textContent ?? '').trim().replace(/\s+/g, ' ') || href;
  const icon = getRowIconClass(row) ?? 'fa fa-link';

  const courseCode = getCourseCodeFromUrl(window.location.href);
  const courseName = getCourseName();

  const descParts = [courseCode, courseName].filter(Boolean);
  const desc = descParts.join(' - ');

  return {
    type: 'course_content',
    href,
    icon,
    name,
    desc,
    addedAt: new Date().toISOString(),
  };
}

function getRowIconClass(row: HTMLTableRowElement): string | undefined {
  const iconEl = row.querySelector('td i') as HTMLElement | null;
  const className = iconEl?.getAttribute('class')?.trim();
  return className || undefined;
}

function getCourseCodeFromUrl(url: string): string {
  const match = url.match(/cid:([^/?#]+)/);
  return match?.[1] ?? '';
}

function getCourseName(): string {
  const h1 = document.querySelector('h1');
  const nameFromH1 = h1?.textContent?.trim().replace(/\s+/g, ' ');
  if (nameFromH1) return nameFromH1;

  return (document.title ?? '').trim().replace(/\s+/g, ' ');
}

import {
  type CourseListPanelApi,
  type CourseListPanelUpdateContext,
} from '../registries/course-list-panels-registry';
import type { CourseListPanelsRegistry } from '../registries/course-list-panels-registry';
import type { FeatureDef } from '../runtime/types';

const ROOT_ID = 'uw-online-class-status';
const PANEL_NAME = 'course-list-online-class-status';

type FilterKey = 'active' | 'expired' | 'coming-soon' | 'all';

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  active: 'Active',
  expired: 'Expired',
  'coming-soon': 'Coming soon',
};

type OnlineClassRow = {
  courseCode: string;
  className: string;
  dateText: string;
  startTimeText: string;
  endTimeText: string;
  durationText: string;
  platformText: string;
  liveHref: string | null;
  recordedHref: string | null;
  attendanceHref: string | null;
  statusText: string;
  startAtMs: number | null;
};

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'default';

let currentFilter: FilterKey = 'active';
let cachedRows: OnlineClassRow[] | null = null;
let cachedForCodesKey: string | null = null;
let renderToken = 0;

export const onlineClassListFeature: FeatureDef = {
  id: 'onlineClassListPanel',
  title: 'Online Classes (Panel)',
  description: 'Shows upcoming/active online classes on the course list page.',
  defaults: { enabled: true, options: {} },
  dependsOnPatches: ['courseListPanels'],
  dependsOnRegistries: ['courseListPanels'],
  setup: async ({ registries }) => {
    const registry = registries.courseListPanels as CourseListPanelsRegistry | undefined;
    if (!registry) return {};

    const dispose = registry.register({
      name: PANEL_NAME,
      render: (updateCtx, _prepared, api) => renderOnlineClassPanel(updateCtx, api),
    });

    return {
      cleanup: () => {
        dispose();
        document.getElementById(ROOT_ID)?.remove();
        cachedRows = null;
        cachedForCodesKey = null;
        renderToken++;
      },
    };
  },
};

function renderOnlineClassPanel(
  _updateCtx: CourseListPanelUpdateContext,
  _api: CourseListPanelApi,
): HTMLElement {
  document.getElementById(ROOT_ID)?.remove();

  const token = ++renderToken;

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
  title.textContent = 'Online Classes';
  header.appendChild(title);

  const right = document.createElement('div');
  right.className = 'd-flex align-items-center';
  header.appendChild(right);

  const count = document.createElement('small');
  count.className = 'text-muted';
  count.style.marginRight = '10px';
  count.textContent = '—';
  right.appendChild(count);

  const filterSelect = document.createElement('select');
  filterSelect.className = 'custom-select custom-select-sm';
  filterSelect.style.width = 'auto';
  filterSelect.ariaLabel = 'Filter online classes';

  const options: FilterKey[] = ['all', 'active', 'expired', 'coming-soon'];
  for (const key of options) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = FILTER_LABELS[key];
    filterSelect.appendChild(opt);
  }

  filterSelect.value = currentFilter;
  right.appendChild(filterSelect);

  const body = document.createElement('div');
  body.style.marginTop = '10px';
  card.appendChild(body);

  const codes = getCourseCodesFromDropdown();
  if (codes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-muted';
    empty.textContent = 'No courses found.';
    body.appendChild(empty);
    return root;
  }

  const listHost = document.createElement('div');
  body.appendChild(listHost);

  const loading = document.createElement('div');
  loading.className = 'text-muted';
  loading.textContent = 'Loading online classes…';
  listHost.appendChild(loading);

  void (async () => {
    try {
      const codesKey = codes.slice().sort().join(',');
      if (!cachedRows || cachedForCodesKey !== codesKey) {
        cachedRows = await fetchAllRows(codes);
        cachedForCodesKey = codesKey;
      }

      if (token !== renderToken) return;

      const rows = cachedRows ?? [];
      renderRowsInto(listHost, count, filterSelect, rows);

      filterSelect.addEventListener('change', () => {
        const next = (filterSelect.value || 'active') as FilterKey;
        currentFilter = next;
        renderRowsInto(listHost, count, filterSelect, rows);
      });
    } catch {
      if (token !== renderToken) return;

      listHost.innerHTML = '';
      const err = document.createElement('div');
      err.className = 'text-muted';
      err.textContent = 'Failed to load online classes.';
      listHost.appendChild(err);
    }
  })();

  return root;
}

function renderRowsInto(
  listHost: HTMLElement,
  countEl: HTMLElement,
  filterSelect: HTMLSelectElement,
  rows: OnlineClassRow[],
) {
  filterSelect.value = currentFilter;

  const filtered = filterRows(rows, currentFilter);
  countEl.textContent = `${filtered.length}`;

  listHost.innerHTML = '';

  if (currentFilter === 'active' && filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-muted';
    empty.textContent = 'No active classes. ';

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'Show all classes >';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      currentFilter = 'all';
      filterSelect.value = 'all';
      renderRowsInto(listHost, countEl, filterSelect, rows);
    });

    empty.appendChild(link);
    listHost.appendChild(empty);
    return;
  }

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-muted';
    empty.textContent = 'No classes found.';
    listHost.appendChild(empty);
    return;
  }

  const sorted = sortRows(filtered, currentFilter);

  const scroller = document.createElement('div');
  scroller.className = 'd-flex flex-row flex-nowrap';
  scroller.style.overflowX = 'auto';
  scroller.style.overflowY = 'hidden';
  scroller.style.paddingBottom = '6px';
  listHost.appendChild(scroller);

  for (const row of sorted) {
    scroller.appendChild(renderRowCard(row, currentFilter));
  }
}

function renderRowCard(row: OnlineClassRow, filter: FilterKey): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.minWidth = filter === 'active' ? '320px' : '280px';
  wrapper.style.maxWidth = filter === 'active' ? '320px' : '280px';
  wrapper.className = 'mr-2';

  const item = document.createElement('div');
  item.className = 'card-box';
  item.style.padding = '12px';
  wrapper.appendChild(item);

  const top = document.createElement('div');
  top.className = 'd-flex justify-content-between align-items-center';
  item.appendChild(top);

  const code = document.createElement('div');
  code.style.fontWeight = '600';
  code.textContent = row.courseCode;
  top.appendChild(code);

  const badge = document.createElement('span');
  badge.className = `label label-table ${toneToLabelClass(mapStatusToTone(row.statusText))}`;
  badge.textContent = normalizeStatus(row.statusText);
  top.appendChild(badge);

  // const name = document.createElement('div');
  // name.style.marginTop = '8px';
  // name.style.fontWeight = '600';
  // name.className = 'text-truncate';
  // name.textContent = row.className || 'Online class';
  // item.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'text-muted';
  meta.style.marginTop = '6px';
  meta.style.fontSize = '0.85rem';
  meta.innerHTML = `${escapeHtml(row.dateText)} · ${escapeHtml(row.startTimeText)}–${escapeHtml(
    row.endTimeText,
  )}`;
  item.appendChild(meta);

  if (filter === 'active') {
    const detail = document.createElement('div');
    detail.className = 'text-muted';
    detail.style.marginTop = '6px';
    detail.style.fontSize = '0.85rem';
    detail.textContent = row.platformText || '';
    if (detail.textContent) item.appendChild(detail);

    const actions = document.createElement('div');
    actions.className = 'd-flex align-items-center';
    actions.style.marginTop = '10px';
    item.appendChild(actions);

    if (row.attendanceHref) {
      const attendance = document.createElement('a');
      attendance.href = toAbsoluteHref(row.attendanceHref);
      attendance.className = 'btn btn-custom btn-rounded waves-effect waves-light btn-sm';
      attendance.target = '_blank';
      attendance.rel = 'noreferrer';
      attendance.textContent = 'Attendance';
      actions.appendChild(attendance);
    } else {
      const attendance = document.createElement('span');
      attendance.className = 'text-muted';
      attendance.textContent = 'Attendance unavailable';
      actions.appendChild(attendance);
    }

    const links = document.createElement('div');
    links.style.marginLeft = '10px';
    actions.appendChild(links);

    if (row.liveHref) {
      const a = document.createElement('a');
      a.href = toAbsoluteHref(row.liveHref);
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.className = 'text-muted';
      a.textContent = 'Live';
      links.appendChild(a);
    }

    if (row.recordedHref) {
      if (links.childNodes.length) {
        const sep = document.createElement('span');
        sep.className = 'text-muted';
        sep.textContent = ' · ';
        links.appendChild(sep);
      }
      const a = document.createElement('a');
      a.href = toAbsoluteHref(row.recordedHref);
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.className = 'text-muted';
      a.textContent = 'Recorded';
      links.appendChild(a);
    }
  } else {
    const linkRow = document.createElement('div');
    linkRow.style.marginTop = '10px';
    item.appendChild(linkRow);

    const a = document.createElement('a');
    a.href = `${window.location.origin}/OnlineClasses/index/${encodeURIComponent(row.courseCode)}`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.className = 'text-muted';
    a.textContent = 'Open schedule';
    linkRow.appendChild(a);
  }

  return wrapper;
}

function getCourseCodesFromDropdown(): string[] {
  const els = Array.from(
    document.querySelectorAll('.dropdown-course > a.notify-item[href^="/courses/summary"] > p'),
  ) as HTMLElement[];

  const codes: string[] = [];

  for (const el of els) {
    const text = (el.innerText ?? el.textContent ?? '').trim();
    const code = extractCourseCode(text);
    if (!code) continue;
    if (!codes.includes(code)) codes.push(code);
  }

  return codes;
}

function extractCourseCode(text: string): string | null {
  // Typical formats on the portal: "CSC207" or "CSC207 - Something".
  const normalized = text.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/\b([A-Z]{2,}\d{2,}[A-Z]?)\b/);
  return match?.[1] ?? null;
}

async function fetchAllRows(courseCodes: string[]): Promise<OnlineClassRow[]> {
  const concurrency = 3;
  const queue = [...courseCodes];
  const results: OnlineClassRow[] = [];

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const code = queue.shift();
      if (!code) return;
      const rows = await fetchCourseRows(code);
      results.push(...rows);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchCourseRows(courseCode: string): Promise<OnlineClassRow[]> {
  const url = `${window.location.origin}/OnlineClasses/index/${encodeURIComponent(courseCode)}`;

  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!res.ok) {
    return [];
  }

  const html = await res.text();
  return parseOnlineClassHtml(courseCode, html);
}

function parseOnlineClassHtml(courseCode: string, html: string): OnlineClassRow[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('#onlineclassTbl');
  const rows = Array.from(table?.querySelectorAll('tbody tr') ?? []) as HTMLTableRowElement[];

  const parsed: OnlineClassRow[] = [];

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));

    const className = cleanText(cells.at(1)?.textContent);
    const dateText = cleanText(cells.at(2)?.textContent);
    const startTimeText = cleanText(cells.at(3)?.textContent);
    const endTimeText = cleanText(cells.at(4)?.textContent);
    const durationText = cleanText(cells.at(5)?.textContent);
    const platformText = cleanText(cells.at(6)?.textContent);

    const liveHref = (cells.at(7)?.querySelector('a[href]') as HTMLAnchorElement | null)?.getAttribute(
      'href',
    );
    const recordedHref = (
      (cells.at(8)?.querySelector('a[href]') as HTMLAnchorElement | null)?.getAttribute('href') ?? null
    );
    const attendanceHref = (
      (cells.at(9)?.querySelector('a[href]') as HTMLAnchorElement | null)?.getAttribute('href') ?? null
    );

    const statusText = cleanText(cells.at(10)?.textContent);
    const startAtMs = toStartAtMs(dateText, startTimeText);

    if (!className && !dateText && !statusText) continue;

    parsed.push({
      courseCode,
      className,
      dateText,
      startTimeText,
      endTimeText,
      durationText,
      platformText,
      liveHref: liveHref ? liveHref.trim() : null,
      recordedHref: recordedHref ? recordedHref.trim() : null,
      attendanceHref: attendanceHref ? attendanceHref.trim() : null,
      statusText,
      startAtMs,
    });
  }

  return parsed;
}

function filterRows(rows: OnlineClassRow[], filter: FilterKey): OnlineClassRow[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => categorizeStatus(r.statusText) === filter);
}

function sortRows(rows: OnlineClassRow[], filter: FilterKey): OnlineClassRow[] {
  const withTime = (r: OnlineClassRow) => r.startAtMs ?? 0;
  const sorted = [...rows].sort((a, b) => {
    const aTime = withTime(a);
    const bTime = withTime(b);
    if (aTime !== bTime) return aTime - bTime;
    return (a.courseCode + a.className).localeCompare(b.courseCode + b.className);
  });

  if (filter === 'expired') {
    sorted.reverse();
  }

  return sorted;
}

function categorizeStatus(statusText: string): Exclude<FilterKey, 'all'> {
  const s = normalizeStatus(statusText).toLowerCase();
  if (s.includes('expired')) return 'expired';
  if (s.includes('active')) return 'active';
  if (s.includes('coming soon') || s.includes('upcoming') || s.includes('scheduled')) return 'coming-soon';
  return 'coming-soon';
}

function normalizeStatus(statusText: string): string {
  return cleanText(statusText) || 'Unknown';
}

function cleanText(text: string | null | undefined): string {
  return (text ?? '').trim().replace(/\s+/g, ' ');
}

function toStartAtMs(dateText: string, startTimeText: string): number | null {
  // Typical format: DD/MM/YYYY and 4:00 PM
  const d = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const t = startTimeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!d || !t) return null;

  const day = Number(d[1]);
  const month = Number(d[2]);
  const year = Number(d[3]);
  let hour = Number(t[1]);
  const minute = Number(t[2]);
  const ampm = t[3].toUpperCase();

  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toAbsoluteHref(href: string): string {
  if (!href) return window.location.href;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${window.location.origin}${href}`;
  return new URL(href, window.location.href).toString();
}

function mapStatusToTone(status: string): StatusTone {
  const s = status.trim().toLowerCase();
  if (s.includes('expired')) return 'danger';
  if (s.includes('active')) return 'success';
  if (s.includes('ongoing') || s.includes('in progress')) return 'warning';
  if (s.includes('upcoming') || s.includes('scheduled')) return 'info';
  return 'default';
}

function toneToLabelClass(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return 'label-success';
    case 'warning':
      return 'label-warning';
    case 'danger':
      return 'label-danger';
    case 'info':
      return 'label-info';
    default:
      return 'label-default';
  }
}

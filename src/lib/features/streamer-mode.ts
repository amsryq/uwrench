import type { FeatureDef } from '../runtime/types';

type StreamerModeSubOptions = {
  hideIdentity: unknown;
  hideProfilePhoto: unknown;
};

export const streamerModeFeature: FeatureDef<unknown, StreamerModeSubOptions> = {
  id: 'streamerMode',
  title: 'Hide Identifying Info',
  description: 'Hide identifying info for screen sharing.',
  defaults: {
    enabled: true,
    options: {},
  },
  subFeatures: {
    hideIdentity: {
      id: 'hideIdentity',
      title: 'Hide student identity',
      defaults: { enabled: true, options: {} },
    },
    hideProfilePhoto: {
      id: 'hideProfilePhoto',
      title: 'Hide profile photo',
      defaults: { enabled: true, options: {} },
    },
  },
  setup: async (_ctx, state) => {
    const cleanups: Array<() => void> = [];

    if (state.sub.hideIdentity.enabled) {
      const cleanup = setupTeamInfoRemoval();
      if (cleanup) cleanups.push(cleanup);
    }

    if (state.sub.hideProfilePhoto.enabled) {
      const cleanup = setupPfpRemoval();
      if (cleanup) cleanups.push(cleanup);
    }

    return {
      cleanup: async () => {
        for (const fn of cleanups.splice(0).reverse()) fn();
      },
    };
  },
};

export function setupTeamInfoRemoval() {
  const teamInfoStyle = document.createElement('style');
  teamInfoStyle.textContent = `
    .about-team:has(.col-sm-7 > h5) {
      display: none !important;
    }
  `;

  document.documentElement.append(teamInfoStyle);

  return () => {
    teamInfoStyle.remove();
  };
}

export function setupPfpRemoval() {
  const navPfpStyle = document.createElement('style');
  navPfpStyle.textContent = `
    .topbar .float-right img,
    #image[alt=team-member] {
      opacity: 0;
    }
  `;

  document.documentElement.append(navPfpStyle);

  let imgStyle: HTMLStyleElement | null = null;

  const handleDOMContentLoaded = () => {
    const pfpImg = document.querySelector('.topbar .float-right img');
    const pfpSrc = pfpImg?.getAttribute('src');

    if (pfpSrc) {
      imgStyle = document.createElement('style');
      imgStyle.textContent = `
        img[src="${pfpSrc}"] {
          opacity: 0;
        }
      `;

      navPfpStyle.remove();
      document.head.append(imgStyle);
    }
  };

  window.addEventListener('DOMContentLoaded', handleDOMContentLoaded);

  return () => {
    window.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
    navPfpStyle.remove();
    imgStyle?.remove();
  };
}

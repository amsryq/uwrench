import type { FeatureDef } from '../runtime/types';

export function setupLoginRedirect() {
  let preLoginUrl: string | null = null;
  const handler = (details: Browser.webRequest.OnBeforeRedirectDetails) => {
      if (details.redirectUrl.endsWith('/login')) {
        preLoginUrl = details.url;
      } else if (details.url.endsWith('/login') && details.redirectUrl.endsWith('/courses/list_course')) {
        if (details.tabId !== -1 && preLoginUrl != null) {
          // Redirect to lastUrl
          browser.tabs.update(details.tabId, { url: preLoginUrl! });
        }
        preLoginUrl = null;
      }
    };

  browser.webRequest.onBeforeRedirect.addListener(handler, { urls: ['*://ufuture.uitm.edu.my/*'] });

  return () => {
    try {
      browser.webRequest.onBeforeRedirect.removeListener(handler);
    } catch {
      // Ignore cleanup errors.
    }
  };
}

export const loginRedirectFeature: FeatureDef = {
  id: 'loginRedirect',
  title: 'Login Redirect',
  description: 'Redirect back to the page you were on after logging in.',
  defaults: { enabled: true, options: {} },
  setup: async () => {
    return { cleanup: setupLoginRedirect() };
  },
};

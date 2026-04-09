import type { FeatureDef } from "../runtime/types";
import { isFeatureEnabled as getFeatureEnabled } from "../settings/settings-store";

const LOGIN_PATH = "/login";
const COURSE_LIST_PATH = "/courses/list_course";
const REDIRECT_URLS = ["*://ufuture.uitm.edu.my/*"];

type LoginRedirectState = Record<string, string>;

const loginRedirectStateItem = storage.defineItem<LoginRedirectState>("session:login_redirect_state", {
  fallback: {},
});

async function isLoginRedirectEnabled(): Promise<boolean> {
  return await getFeatureEnabled("loginRedirect");
}

export function registerLoginRedirectListener() {
  const handler = (details: Browser.webRequest.OnBeforeRedirectDetails) => {
    void (async () => {
      if (details.tabId === -1) return;
      if (!(await isLoginRedirectEnabled())) return;

      const stateKey = String(details.tabId);
      const state = await loginRedirectStateItem.getValue();

      if (details.redirectUrl.endsWith(LOGIN_PATH)) {
        await loginRedirectStateItem.setValue({
          ...state,
          [stateKey]: details.url,
        });
        return;
      }

      if (!details.url.endsWith(LOGIN_PATH) || !details.redirectUrl.endsWith(COURSE_LIST_PATH))
        return;

      const preLoginUrl = state[stateKey];
      if (!preLoginUrl) return;

      const nextState = { ...state };
      delete nextState[stateKey];
      await loginRedirectStateItem.setValue(nextState);

      await browser.tabs.update(details.tabId, { url: preLoginUrl });
    })();
  };

  browser.webRequest.onBeforeRedirect.addListener(handler, {
    urls: REDIRECT_URLS,
  });

  return () => {
    browser.webRequest.onBeforeRedirect.removeListener(handler);
  };
}

export function setupLoginRedirect() {
  return registerLoginRedirectListener();
}

export const loginRedirectFeature: FeatureDef = {
  id: "loginRedirect",
  title: "Login Redirect",
  description: "Redirect back to the page you were on after logging in.",
  defaults: { enabled: true, options: {} },
  setup: async () => {
    return { cleanup: setupLoginRedirect() };
  },
};

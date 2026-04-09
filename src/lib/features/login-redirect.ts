import type { FeatureDef } from "../runtime/types";
import { loginRedirectStateItem, settingsItem } from "../storage/items";

const LOGIN_PATH = "/login";
const COURSE_LIST_PATH = "/courses/list_course";
const REDIRECT_URLS = ["*://ufuture.uitm.edu.my/*"];

async function isFeatureEnabled(): Promise<boolean> {
  const settings = await settingsItem.getValue();
  return settings.features.loginRedirect?.enabled ?? true;
}

export function registerLoginRedirectListener() {
  const handler = (details: Browser.webRequest.OnBeforeRedirectDetails) => {
    void (async () => {
      if (details.tabId === -1) return;
      if (!(await isFeatureEnabled())) return;

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

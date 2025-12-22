export function setupLoginRedirect() {
  let preLoginUrl: string | null = null;
  const unsubscribe = browser.webRequest.onBeforeRedirect.addListener(
    (details) => {
      if (details.redirectUrl.endsWith('/login')) {
        preLoginUrl = details.url;
      } else if (details.url.endsWith('/login') && details.redirectUrl.endsWith('/courses/list_course')) {
        if (details.tabId !== -1 && preLoginUrl != null) {
          // Redirect to lastUrl
          browser.tabs.update(details.tabId, { url: preLoginUrl! });
        }
        preLoginUrl = null;
      }
    },
    { urls: ['*://ufuture.uitm.edu.my/*'] }
  );

  return unsubscribe;
}

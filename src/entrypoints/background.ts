export default defineBackground(() => {
  console.log('Hello from UWrench!');

  let preLoginUrl: string | null = null;
  browser.webRequest.onBeforeRedirect.addListener(
    (details) => {
      if (details.redirectUrl.endsWith('/login')) {
        preLoginUrl = details.url;
      }

      if (details.url.endsWith('/login') && details.redirectUrl.endsWith('/courses/list_course')) { 
        if (details.tabId !== -1) {
          // Redirect to lastUrl
          browser.tabs.update(details.tabId, { url: preLoginUrl! });
        }
        preLoginUrl = null; // Clear after use
      }
    },
    { urls: ['*://ufuture.uitm.edu.my/*'] },
  );
});

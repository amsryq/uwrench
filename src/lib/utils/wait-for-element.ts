export function waitForElement(selector: string): Promise<Element | null> {
    return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver((mutations) => {
            const el = document.querySelector(selector);
            if (el) {
                resolve(el);
                observer.disconnect();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, 10000);
    });
}

export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    const style = document.createElement('style');
    style.textContent = `
      .topbar .float-right img,
      #image[alt=team-member] {
        display: none !important;
      }
    `;

    (document.head ?? document.documentElement).append(style);

    window.addEventListener('DOMContentLoaded', () => {
      const pfpImg = document.querySelector('.topbar .float-right img');
      const pfpSrc = pfpImg?.getAttribute('src');

      if (pfpSrc) {
        // hide all img with src=pfpSrc (add style)
        const style = document.createElement('style');
        style.textContent = `
          img[src="${pfpSrc}"] {
            display: none !important;
          }
        `;
        (document.head ?? document.documentElement).append(style);
      }
    });
  },
});

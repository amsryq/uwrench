export default defineContentScript({
  matches: ['*://ufuture.uitm.edu.my/*'],
  runAt: "document_start",
  main() {
    const navPfpStyle = document.createElement('style');
    navPfpStyle.textContent = `
      .topbar .float-right img,
      #image[alt=team-member] {
        display: none !important;
      }
    `;

    document.documentElement.append(navPfpStyle);

    window.addEventListener('DOMContentLoaded', () => {
      const pfpImg = document.querySelector('.topbar .float-right img');
      const pfpSrc = pfpImg?.getAttribute('src');

      if (pfpSrc) {
        // hide all img with src=pfpSrc (add style)
        const imgStyle = document.createElement('style');
        imgStyle.textContent = `
          img[src="${pfpSrc}"] {
            display: none !important;
          }
        `;

        navPfpStyle.remove();
        document.head.append(imgStyle);
      }
    });
  },
});

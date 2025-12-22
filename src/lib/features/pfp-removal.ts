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

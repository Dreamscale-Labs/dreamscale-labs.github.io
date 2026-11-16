// Videos start when they scroll into view and pause when they leave, so the page
// only downloads the clips a reader actually reaches. A clip the reader pauses
// stays paused.
const videos = [...document.querySelectorAll('video[data-autoplay]')];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function play(video) {
  if (reduceMotion || video.dataset.userPaused) return;
  video.play().catch(() => {});
}

function pause(video) {
  if (video.paused) return;
  video.dataset.autoPausing = '1';
  video.pause();
}

videos.forEach(video => {
  video.addEventListener('pause', () => {
    if (video.dataset.autoPausing) delete video.dataset.autoPausing;
    else if (!video.ended) video.dataset.userPaused = '1';
  });
  video.addEventListener('play', () => delete video.dataset.userPaused);
});

if ('IntersectionObserver' in window) {
  // Start fetching a little before a clip arrives, so it is ready to play.
  const warm = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (entry.target.preload === 'none') entry.target.preload = 'auto';
      warm.unobserve(entry.target);
    });
  }, { rootMargin: '800px 0px' });

  const visible = new IntersectionObserver(entries => {
    entries.forEach(entry => (entry.isIntersecting ? play : pause)(entry.target));
  }, { threshold: 0.35 });

  videos.forEach(video => {
    warm.observe(video);
    visible.observe(video);
  });
} else {
  videos.forEach(play);
}

// Open the model subsections in the table of contents while Model comparison or
// one of its subsections is the section being read (reading-progress.js marks it).
const tocGroup = document.querySelector('.article-toc .toc-group');
if (tocGroup) {
  const parentLink = tocGroup.previousElementSibling;
  const syncGroup = () => {
    const subActive = tocGroup.querySelector('[aria-current]');
    tocGroup.classList.toggle('is-open', Boolean(subActive || parentLink.hasAttribute('aria-current')));
    if (subActive) parentLink.setAttribute('data-parent-current', '');
    else parentLink.removeAttribute('data-parent-current');
  };
  new MutationObserver(syncGroup).observe(tocGroup.parentElement, { subtree: true, attributeFilter: ['aria-current'] });
  syncGroup();
}

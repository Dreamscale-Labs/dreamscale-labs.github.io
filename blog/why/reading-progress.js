const article = document.querySelector('.article');
const progress = document.querySelector('.reading-progress');
const fill = progress.querySelector('span');
const toc = document.querySelector('.article-toc');
const tocLinks = [...(toc?.querySelectorAll('nav a') || [])];
const sections = tocLinks.map(link => document.querySelector(link.getAttribute('href')));
const compact = matchMedia('(max-width: 1000px)');
function setTocMode() { if (toc) toc.open = !compact.matches; }
compact.addEventListener('change', setTocMode);
setTocMode();
toc?.querySelector('summary').addEventListener('click', event => {
  if (!compact.matches) event.preventDefault();
});
tocLinks.forEach((link, index) => link.addEventListener('click', () => {
  if (compact.matches) toc.open = false;
  sections[index].focus({ preventScroll: true });
}));
let scheduled = false;
function updateProgress() {
  const bounds = article.getBoundingClientRect();
  const distance = bounds.height - window.innerHeight;
  const fraction = distance > 0
    ? Math.max(0, Math.min(1, -bounds.top / distance))
    : (bounds.bottom <= window.innerHeight ? 1 : 0);
  fill.style.transform = `scaleY(${fraction})`;
  progress.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
  let active = 0;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= 120) active = index;
  });
  if (fraction === 1) active = sections.length - 1;
  tocLinks.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scheduled = false;
}
function requestUpdate() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(updateProgress);
  }
}
window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', requestUpdate);
window.addEventListener('load', requestUpdate);
new ResizeObserver(requestUpdate).observe(article);
updateProgress();

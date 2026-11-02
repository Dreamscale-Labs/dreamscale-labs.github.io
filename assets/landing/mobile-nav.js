const mobileMenu = document.querySelector('.mobile-menu');
if (mobileMenu) {
  mobileMenu.addEventListener('click', event => {
    if (event.target.closest('a')) mobileMenu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileMenu.open) {
      mobileMenu.open = false;
      mobileMenu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', event => {
    if (mobileMenu.open && !mobileMenu.contains(event.target)) mobileMenu.open = false;
  });
}

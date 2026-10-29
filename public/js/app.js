// Shared front-end behaviour — no framework, kept small and dependency-free.
document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Dismissible flash alerts
  document.querySelectorAll('[data-alert-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const alertEl = btn.closest('.alert');
      if (alertEl) alertEl.remove();
    });
  });

  // Confirm destructive actions (cancel appointment, reject doctor, etc.)
  document.querySelectorAll('[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      const msg = form.getAttribute('data-confirm');
      if (!window.confirm(msg)) e.preventDefault();
    });
  });

  // Prevent booking a past date client-side (server still validates)
  document.querySelectorAll('[data-min-today]').forEach((input) => {
    const today = new Date().toISOString().split('T')[0];
    input.setAttribute('min', today);
  });

  // Live filter on the "find doctors" page (works alongside server search)
  const liveSearch = document.querySelector('[data-live-search]');
  if (liveSearch) {
    const cards = document.querySelectorAll('[data-doctor-card]');
    const emptyState = document.querySelector('[data-search-empty]');
    liveSearch.addEventListener('input', () => {
      const term = liveSearch.value.trim().toLowerCase();
      let visibleCount = 0;
      cards.forEach((card) => {
        const name = (card.getAttribute('data-name') || '').toLowerCase();
        const spec = (card.getAttribute('data-spec') || '').toLowerCase();
        const match = !term || name.includes(term) || spec.includes(term);
        card.style.display = match ? '' : 'none';
        if (match) visibleCount += 1;
      });
      if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    });
  }
});

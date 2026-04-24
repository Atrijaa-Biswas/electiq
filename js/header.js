/**
 * header.js — Shared authenticated header logic
 *
 * Responsibilities:
 * - Auth guard: redirect to login.html if not signed in
 * - Render user avatar + dropdown in the header
 * - Handle dropdown open/close (click outside, ESC)
 * - Sign Out via AuthService
 *
 * Include this script on every protected page.
 * The body must start with opacity:0 and this script reveals it
 * only after the auth check passes.
 */

const HeaderController = (() => {

  /**
   * Run the auth guard + render the authenticated header.
   * Call this once on each protected page.
   * @returns {Promise<object>} — the authenticated Firebase user
   */
  const init = () => {
    return new Promise((resolve) => {
      window.AuthService.onAuthReady(async (user) => {
        if (!user) {
          // Save current page so login can redirect back
          sessionStorage.setItem('electiq_last_page', window.location.pathname.split('/').pop());
          window.location.href = 'login.html';
          return; // Stop — body stays hidden
        }

        // Auth passed — reveal the page
        document.body.style.opacity = '1';

        // Render avatar in header
        _renderUserMenu(user);

        resolve(user);
      });
    });
  };

  // ─── Render User Menu ────────────────────────────────────────────────────

  const _renderUserMenu = (user) => {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;

    const initials = window.AuthService.getUserInitials(user);
    const name     = user.displayName || user.email?.split('@')[0] || 'User';
    const email    = user.email || '';
    const photoURL = user.photoURL || '';

    const avatarHTML = photoURL
      ? `<div class="user-dropdown-avatar"><img src="${photoURL}" alt="${name}" referrerpolicy="no-referrer"></div>`
      : `<div class="user-dropdown-avatar-initials">${initials}</div>`;

    // Build avatar button + dropdown
    const menuEl = document.createElement('div');
    menuEl.className = 'user-menu';
    menuEl.innerHTML = `
      <button
        class="user-avatar-btn"
        id="user-avatar-btn"
        type="button"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label="User menu for ${name}"
      >
        ${photoURL
          ? `<img src="${photoURL}" alt="${name}" referrerpolicy="no-referrer">`
          : initials
        }
      </button>
      <div class="user-dropdown" id="user-dropdown" role="menu" aria-label="User options">
        ${avatarHTML}
        <div class="user-dropdown-name" title="${name}">${name}</div>
        <div class="user-dropdown-email" title="${email}">${email}</div>
        <hr class="user-dropdown-divider">
        <div class="user-dropdown-actions">
          <button class="btn-signout" id="btn-signout" type="button" role="menuitem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    `;

    // Prepend to header-right (before translate widget)
    headerRight.insertBefore(menuEl, headerRight.firstChild);

    // ── Dropdown Toggle ────────────────────────────────────────────
    const avatarBtn = document.getElementById('user-avatar-btn');
    const dropdown  = document.getElementById('user-dropdown');

    const openDropdown = () => {
      dropdown.classList.add('open');
      avatarBtn.setAttribute('aria-expanded', 'true');
    };

    const closeDropdown = () => {
      dropdown.classList.remove('open');
      avatarBtn.setAttribute('aria-expanded', 'false');
    };

    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.contains('open') ? closeDropdown() : openDropdown();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!menuEl.contains(e.target)) closeDropdown();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDropdown();
    });

    // Sign Out
    document.getElementById('btn-signout')?.addEventListener('click', async () => {
      closeDropdown();
      await window.AuthService.signOut();
    });
  };

  return { init };
})();

window.HeaderController = HeaderController;

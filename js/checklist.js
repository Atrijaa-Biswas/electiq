/**
 * checklist.js — Voter Readiness Certificate
 *
 * Responsibilities:
 * - Call Gemini to generate personalised voter checklist (cached)
 * - Render checklist items grouped by phase in gazette document
 * - Handle interactive checkbox ticking with strikethrough animation
 * - Print (PDF) via window.print()
 * - Share via Web Share API with graceful fallback (copy link)
 */

const qs = (sel, ctx = document) => ctx.querySelector(sel);

// Phase icon mapping
const PHASE_ICONS = {
  'Before Election Day': '📋',
  'On Election Day':     '🗳️',
  'After Election Day':  '✅',
};

// ─── Checklist Generation ──────────────────────────────────────────────────

const generateChecklist = async () => {
  // Cache in sessionStorage — checklist shouldn't regenerate on every visit
  const cacheKey = 'electiq_checklist_v1';
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (_) { /* ignore corrupt cache */ }
  }

  const prompt = window.GeminiAPI.checklistPrompt();
  const items = await window.GeminiAPI.callForJSON(prompt);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Gemini returned an unexpected checklist format. Please try refreshing.');
  }

  sessionStorage.setItem(cacheKey, JSON.stringify(items));
  return items;
};

// ─── Render ────────────────────────────────────────────────────────────────

const renderChecklist = (items) => {
  const container = qs('#checklist-content');
  if (!container) return;

  // Group by phase
  const phases = {};
  items.forEach(item => {
    const phase = item.phase || 'General';
    if (!phases[phase]) phases[phase] = [];
    phases[phase].push(item);
  });

  container.innerHTML = '';

  Object.entries(phases).forEach(([phase, phaseItems]) => {
    const section = document.createElement('section');
    section.className = 'phase-section';
    section.setAttribute('aria-labelledby', `phase-${phase.replace(/\s+/g, '-')}`);

    const icon = PHASE_ICONS[phase] || '📌';
    const heading = document.createElement('h2');
    heading.className = 'phase-heading';
    heading.id = `phase-${phase.replace(/\s+/g, '-')}`;
    heading.textContent = `${icon}  ${phase}`;
    section.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'checklist-items';
    list.setAttribute('role', 'list');

    phaseItems.forEach((item, idx) => {
      const itemId = `check-${phase.replace(/\s+/g, '-')}-${idx}`;

      const li = document.createElement('li');
      li.className = 'checklist-item';
      li.setAttribute('role', 'listitem');

      li.innerHTML = `
        <input
          type="checkbox"
          class="item-checkbox"
          id="${itemId}"
          aria-label="${item.item}"
        >
        <div class="item-content">
          <label class="item-name" for="${itemId}">${item.item}</label>
          <p class="item-detail">${item.detail}</p>
        </div>
        <svg class="item-tick" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="13" fill="#2D6A4F" opacity="0.9"/>
          <path d="M8 14l4 4 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      // Checkbox toggle handler
      const checkbox = li.querySelector('.item-checkbox');
      checkbox.addEventListener('change', () => {
        li.classList.toggle('checked', checkbox.checked);
      });

      list.appendChild(li);
    });

    section.appendChild(list);
    container.appendChild(section);
  });

  // Show action buttons
  const actionsEl = qs('#checklist-actions');
  if (actionsEl) actionsEl.style.display = '';
};

// ─── Print ─────────────────────────────────────────────────────────────────

const handlePrint = () => {
  window.print();
};

// ─── Share ─────────────────────────────────────────────────────────────────

const handleShare = async () => {
  const shareData = {
    title: 'My ElectIQ Voter Readiness Certificate',
    text: 'I just completed the ElectIQ Indian election education course! Check yours out at:',
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      // User cancelled — not an error
    }
  } else {
    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      const shareBtn = qs('#btn-share');
      if (shareBtn) {
        const original = shareBtn.innerHTML;
        shareBtn.textContent = 'Link copied!';
        setTimeout(() => { shareBtn.innerHTML = original; }, 2000);
      }
    } catch (_) {
      alert('Share this page: ' + window.location.href);
    }
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────

const init = async () => {
  // Set certificate date
  const dateEl = qs('#cert-date');
  if (dateEl) {
    dateEl.textContent = `Issued on ${new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    })}`;
  }

  // Initialize Firebase
  try {
    await window.FirebaseService?.init();
  } catch (_) { /* graceful */ }

  // Generate and render checklist
  try {
    const items = await generateChecklist();
    renderChecklist(items);
  } catch (err) {
    const container = qs('#checklist-content');
    if (container) {
      container.innerHTML = `
        <div class="error-card" role="alert">
          <strong>Could not generate your checklist.</strong><br>
          ${err.message}<br><br>
          Please ensure your Gemini API key is set in js/config.js, then
          <a href="checklist.html">try again</a>.
        </div>
      `;
    }
  }

  // Button listeners
  qs('#btn-print')?.addEventListener('click', handlePrint);
  qs('#btn-share')?.addEventListener('click', handleShare);

  qs('.checklist-page')?.classList.add('page-entry');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

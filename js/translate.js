/**
 * translate.js — Google Translate Widget initialization
 *
 * Loads the Google Translate element for all 22 scheduled Indian languages.
 * Attaches to:
 *   #google_translate_element        → desktop header (all pages)
 *   #google_translate_element_mobile → mobile bar (all pages, < 768px)
 *
 * Google Translate only allows one TranslateElement per page per callback,
 * so we initialize the primary element and clone its output into the mobile
 * container using a MutationObserver once the widget renders.
 */

const TranslateService = (() => {

  const LANGS =
    'hi,bn,te,mr,ta,ur,gu,kn,ml,or,pa,as,mai,bho,kok,ne,sa,sd,si,ks,doi,mni';

  /** Called by the Google Translate script after it loads */
  const init = () => {
    if (typeof google === 'undefined' || !google.translate) return;

    // ── Primary element (desktop header) ──────────────────────────────────
    const primaryEl = document.getElementById('google_translate_element');
    const mobileEl  = document.getElementById('google_translate_element_mobile');

    if (primaryEl) {
      new google.translate.TranslateElement(
        {
          pageLanguage:      'en',
          includedLanguages: LANGS,
          layout:            google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay:       false,
          gaTrack:           true
        },
        'google_translate_element'
      );
    }

    // ── Mobile mirror ──────────────────────────────────────────────────────
    // On mobile the primary container is hidden via CSS (.translate-container {display:none}).
    // We watch for when the Google widget populates the primary element, then
    // clone the rendered gadget node into the mobile container.
    if (mobileEl && primaryEl) {
      const observer = new MutationObserver(() => {
        const gadget = primaryEl.querySelector('.goog-te-gadget-simple, .goog-te-gadget');
        if (gadget && !mobileEl.hasChildNodes()) {
          mobileEl.appendChild(gadget.cloneNode(true));
          observer.disconnect();
        }
      });
      observer.observe(primaryEl, { childList: true, subtree: true });
    }
  };

  return { init };
})();

window.TranslateService = TranslateService;

// The Google Translate callback is defined globally
window.googleTranslateElementInit = TranslateService.init;

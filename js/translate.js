/**
 * translate.js — Google Translate Widget initialization
 *
 * Loads the Google Translate element for all 22 scheduled Indian languages.
 * Attaches to #google_translate_element in the header.
 */

const TranslateService = (() => {
  /** Called by the Google Translate script after it loads */
  const init = () => {
    if (typeof google === 'undefined' || !google.translate) return;

    new google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        // All 22 scheduled Indian languages + common regional ones
        includedLanguages:
          'hi,bn,te,mr,ta,ur,gu,kn,ml,or,pa,as,mai,bho,kok,ne,sa,sd,si,ks,doi,mni',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
        gaTrack: true
      },
      'google_translate_element'
    );
  };

  return { init };
})();

window.TranslateService = TranslateService;

// The Google Translate callback is defined globally
window.googleTranslateElementInit = TranslateService.init;

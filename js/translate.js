/**
 * translate.js — Manages the custom dropdown UI for Google Translate.
 * 
 * Instead of showing the native Google Translate widget (which is hard to style and relies on an iframe),
 * we use a custom <select> dropdown, and programmatically sync it with the hidden Google widget.
 */

function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      // The languages we want to support + English
      includedLanguages: 'hi,bn,ta,te,mr,kn,ml,gu,pa,ur,en',
      autoDisplay: false
    },
    'google_translate_element'
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const customSelect = document.getElementById('custom-translate-select');
  if (!customSelect) return;

  // Restore the selected value from the cookie if it exists
  const match = document.cookie.match(/(?:^|;)\s*googtrans=([^;]*)/);
  if (match) {
    const lang = match[1].split('/').pop();
    if (lang) {
      customSelect.value = lang;
    }
  }

  customSelect.addEventListener('change', (e) => {
    const lang = e.target.value;
    const googleSelect = document.querySelector('.goog-te-combo');
    
    if (googleSelect) {
      // Sync value and trigger change event for Google Translate script
      googleSelect.value = lang === 'en' ? '' : lang;
      googleSelect.dispatchEvent(new Event('change'));
    } else {
      // Fallback if the Google script hasn't fully rendered the combo box yet
      const transUrl = '/en/' + (lang === 'en' ? 'en' : lang);
      document.cookie = `googtrans=${transUrl}; path=/`;
      document.cookie = `googtrans=${transUrl}; domain=.${window.location.hostname}; path=/`;
      window.location.reload();
    }
  });
});

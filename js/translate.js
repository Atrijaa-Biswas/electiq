function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    {
      pageLanguage: 'en',
      includedLanguages: 'hi,bn,te,mr,ta,ur,gu,kn,ml,or,pa,as,mai,sat,ks,ne,sd,kok,doi,mni,sa,si',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false
    },
    'google_translate_element'
  );
}

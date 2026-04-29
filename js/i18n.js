i18next
  .use(i18nextHttpBackend)
  .use(i18nextBrowserLanguageDetector)
  .init({
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    ns: ['translation', 'blog'],
    defaultNS: 'translation',
    detection: {
      order: ['htmlTag', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: { escapeValue: false },
  })
  .then(() => {
    updatePageTranslations();
    document.documentElement.lang = i18next.resolvedLanguage;
    const title = i18next.t('page-title');
    if (title && title !== 'page-title') document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', i18next.t('page-description'));
  });

function markdownToHtmlForBold(text) {
  if (!text) return text;
  while (text.match(/\*\*(.*?)\*\*/g)) {
    text = text.replace('**', '<b>').replace('**', '</b>');
  }
  return text;
}

window.updatePageTranslations = function () {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = i18next.t(key);
    el.innerHTML = markdownToHtmlForBold(translation) ?? el.innerHTML;
  });
};

const langSelect = document.getElementById('language-select');
if (langSelect) {
  console.log("idioma", i18next.resolvedLanguage);
  // if resolvedLanguage is null if route is /en/ then set resolvedLanguage to en else set to es
  if (!i18next.resolvedLanguage) {
    const path = window.location.pathname;
    if (path.startsWith('/en/')) {
      i18next.resolvedLanguage = 'en';
    } else {
      i18next.resolvedLanguage = 'es';
    }
  }
  langSelect.value = i18next.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
  langSelect.addEventListener('change', () => {
    const lang = langSelect.value;
    const path = window.location.pathname;
    const isOnRoot = path === '/' || path === '/index.html';
    const isOnEnIndex = path === '/en/' || path === '/en/index.html';

    if (lang === 'en' && isOnRoot) {
      window.location.href = '/en/';
    } else if (lang === 'es' && isOnEnIndex) {
      window.location.href = '/';
    } else {
      i18next.changeLanguage(lang).then(() => {
        updatePageTranslations();
        document.documentElement.lang = lang;
        langSelect.value = lang;
      });
    }
  });
}

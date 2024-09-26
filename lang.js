const languageSelect = document.getElementById('language-select');

let currentLanguage = localStorage.getItem('language') ?? 'es';
languageSelect.value = currentLanguage;

function loadLanguage(lang) {
    localStorage.setItem('language', lang);
    try {
        fetch(`./lang/${lang}.json?t=${Date.now()}`)
            .then(response => response.json())
            .then(data => {
                currentLanguage = lang;
                updateText(data);
            });
    } catch {
        console.error('Error loading language file');
    }
}

function updateText(data) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.innerHTML = markdownToHtmlForBold(data[key]) ?? element.innerHTML;
    });
}

languageSelect.addEventListener('change', () => {
    loadLanguage(languageSelect.value);
});

function markdownToHtmlForBold(text) {
    while(text.match(/\*\*(.*?)\*\*/g) != null) {
        text = text.replace("**", "<b>");
        text = text.replace("**", "</b>");
    }
    return text;
}

// Load the default language on page load
loadLanguage(currentLanguage);

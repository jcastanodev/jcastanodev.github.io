const languageSelect = document.getElementById('language-select');

let currentLanguage = localStorage.getItem('language') ?? 'en';
languageSelect.value = currentLanguage;

function loadLanguage(lang) {
    localStorage.setItem('language', lang);
    fetch(`./lang/${lang}.json`)
        .then(response => response.json())
        .then(data => {
            currentLanguage = lang;
            updateText(data);
        });
}

function updateText(data) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.innerHTML = data[key];
    });
}

languageSelect.addEventListener('change', () => {
    loadLanguage(languageSelect.value);
});

// Load the default language on page load
loadLanguage(currentLanguage);

// profile shuffle
const shuffleButton = document.getElementById('shuffle-button');
shuffleButton.addEventListener('click', shuffle);
const randomFactor = 3;
let lastShuffle = Math.floor(Math.random() * randomFactor) + 1;
document.getElementById("profile-image").src = "assets/profile" + lastShuffle + ".gif";
function shuffle() {
    let random = Math.floor(Math.random() * randomFactor) + 1;
    while(lastShuffle === random) {
        random = Math.floor(Math.random() * randomFactor) + 1;
    }
    lastShuffle = random;
    document.getElementById("profile-image").src = "assets/profile" + random + ".gif";
}

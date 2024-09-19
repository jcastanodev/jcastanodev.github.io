// next profile image
const nextProfileImageButton = document.getElementById('next-profile-image-button');
nextProfileImageButton.addEventListener('click', nextProfileImage);
const maxImageId = 3;
let profileImageCount = Math.floor(Math.random() * maxImageId) + 1;
document.getElementById("profile-image").src = "assets/profile" + profileImageCount + ".gif";
function nextProfileImage() {
    if (profileImageCount === maxImageId) {
        profileImageCount = 1;
    } else {
        profileImageCount++;
    }
    document.getElementById("profile-image").src = "assets/profile" + profileImageCount + ".gif";
}

// show more presentation
const showMoreLessButton = document.getElementById('show-more-less-button');
showMoreLessButton.addEventListener('click', showMoreLessPresentation);
let isPresentationExpanded = false;
const presentationText = document.getElementById('presentation-text');

async function showMoreLessPresentation() {
    if (isPresentationExpanded) {
        document.getElementById('show-less-label-button').style.display = 'none';
        document.getElementById('show-more-label-button').style.display = 'block';
        moreToLessPresentation();
    } else {
        document.getElementById('show-less-label-button').style.display = 'block';
        document.getElementById('show-more-label-button').style.display = 'none';
        lessToMorePresentation();
    }
    isPresentationExpanded = !isPresentationExpanded;
}

function lessToMorePresentation() {
    let shortText = document.getElementById('short-presentation-text').innerHTML;
    const text = document.getElementById('full-presentation-text').innerHTML;
    let newInnerHTML = '';
    for (let i = 0; i < text.length; i++) {
        setTimeout(function () {
            if (i%3 === 0) {
                shortText = progressiveRandomString(shortText, 2);
            }
            newInnerHTML += text[i];
            if (text.length - i <= shortText.length) {
                shortText = shortText.substring(1);
            }
            if (i + 1 >= text.length) {
                presentationText.innerHTML = markdownToHtmlForBold(text);
            } else {
                presentationText.innerHTML = markdownToHtmlForBold(newInnerHTML) + ' ' + shortText;
            }
        }, 1 * i, i);
    }
}

function moreToLessPresentation() {
    const text = document.getElementById('short-presentation-text').innerHTML;
    let largeText = document.getElementById('full-presentation-text').innerHTML;
    let newInnerHTML = '';
    for (let i = 0; i < text.length; i++) {
        setTimeout(function () {
            largeText = progressiveRandomString(largeText, 2);
            largeText = largeText.substring(4);
            newInnerHTML += text[i];
            if (i + 1 >= text.length) {
                presentationText.innerHTML = markdownToHtmlForBold(text);
            } else {
                presentationText.innerHTML = markdownToHtmlForBold(newInnerHTML) + ' ' + largeText;
            }
        }, 4 * i, i);
    }
}

function progressiveRandomString(str, factor) {
    for (let i = 0; i < factor; i++) {
        let random = Math.floor(Math.random() * str.length) + 1;
        while (str[random] === ' ') {
            random = Math.floor(Math.random() * str.length) + 1;
        }
        str = str.substring(0, random) + getRandomLetter() + str.substring(random + 1);
    }
    return str;
}

function getRandomLetter() {
  const min = 97;
  const max = 122;
  const randomCharCode = Math.floor(Math.random() * (max - min + 1)) + min;

  return String.fromCharCode(randomCharCode);
}

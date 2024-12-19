const FRAME_DELAY = 20;
const TOTAL_FRAMES = 125;
const TOTAL_POSITIONS = 4;
const animationFrames = [...Array(TOTAL_FRAMES)].map((e, i) => {
    const numberFrame = i.toString().padStart(3, '0');
    return `./assets/animation/frame_${numberFrame}_delay-0.04s.png`;
});
const slides = [
    {
      "quote": "De repente me di cuenta de que en la Tierra estábamos todos en una misma nave espacial.",
      "author": "Rusty Schweickart (Astronauta del Apolo 9)",
      "image": "world-startship.webp"
    },
    {
      "quote": "Un pequeño paso para un hombre, un gran salto para la humanidad.",
      "author": "Neil Armstrong (Primer hombre en pisar la Luna)",
      "image": "big-step.webp"
    },
    {
      "quote": "La Tierra es azul, y no vi a Dios.",
      "author": "Yuri Gagarin (Primer humano en el espacio)",
      "image": "no-god.png"
    },
    {
      "quote": "El misterio genera curiosidad, y la curiosidad es la base del deseo humano para comprender.",
      "author": "Buzz Aldrin (Segundo hombre en pisar la Luna)",
      "image": ""
    },
    {
      "quote": "Los grandes pensamientos no sólo necesitan alas, sino también un lugar donde aterrizar.",
      "author": "Neil Armstrong (Primer hombre en pisar la Luna)",
      "image": "brain-idea.png"
    },
    {
      "quote": "Si podemos enviar un hombre a la Luna, ¿por qué no podemos…?",
      "author": "John F. Kennedy (Presidente de los Estados Unidos que impulsó el programa Apolo)",
      "image": ""
    },
    {
      "quote": "Mirar hacia la Tierra desde el espacio te cambia para siempre. La relación con tu planeta, contigo mismo, cambia.",
      "author": "Scott Kelly (Astronauta que pasó casi un año en la Estación Espacial Internacional)",
      "image": ""
    },
    {
      "quote": "La exploración vale la pena no sólo por el conocimiento que adquirimos, sino también porque nos recuerda que somos capaces de grandes cosas.",
      "author": "Mae Jemison (Primera mujer afroamericana en viajar al espacio)",
      "image": ""
    },
    {
      "quote": "No tenemos que convertirnos en otra cosa. Tenemos que ser quienes somos.",
      "author": "Chris Hadfield (Astronauta canadiense conocido por su presencia en redes sociales desde el espacio)",
      "image": ""
    },
    {
      "quote": "El espacio es para todos. No está reservado para unos pocos elegidos. Cualquiera puede soñar con las estrellas.",
      "author": "Naoko Yamazaki (Segunda mujer japonesa en viajar al espacio)",
      "image": "vip-zone.png"
    },
    {
        "quote": "Cuando ves la Tierra desde el espacio, ves lo pequeña y frágil que es. Es una llamada a la acción para que todos cuidemos de ella.",
        "author": "Sally Ride (Primera mujer estadounidense en el espacio)",
        "image": ""
    },
    {
        "quote": "Hay algo ahí fuera esperando a que lo descubramos, y eso es lo que hace que la exploración valga la pena.",
        "author": "John Glenn (Primer estadounidense en orbitar la Tierra)",
        "image": "universe.png"
    },
    {
        "quote": "El espacio es nuestro siguiente gran paso.",
        "author": "Buzz Aldrin (Segundo hombre en pisar la Luna)",
        "image": ""
    },
    {
        "quote": "La mejor vista que se puede tener es la del planeta Tierra.",
        "author": "Sigmund Jähn (Primer alemán en el espacio)",
        "image": "planet.jpg"
    }
];

let currentFrame = 0;
const nextFrame = (to) => {
    currentFrame += 1;
    if (currentFrame >= TOTAL_FRAMES) {
        currentFrame = 0;
    }
    document.getElementById('animation').src = animationFrames[currentFrame];
    if (to !== currentFrame) {
        setTimeout(() => nextFrame(to), FRAME_DELAY);
    }
}

let position = 1;
let slide = Math.floor(Math.random() * slides.length) + 1;
let slideSwitcher = false;
const nextPosition = (e) => {
    const previousSlide = document.getElementById(`slide-${slideSwitcher ? 2 : 1}`);
    previousSlide.classList.remove('show');
    previousSlide.style.zIndex = 0;
    slideSwitcher = !slideSwitcher;
    slide += 1;
    if (slide > slides.length) {
        slide = 1;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('q', slide);
    window.history.pushState({}, '', url);
    document.getElementById('slide-count').classList.add('slide-count-next');
    setTimeout(() => {
        document.getElementById('slide-count').innerHTML = slide;
        document.getElementById('slide-count').classList.remove('slide-count-next');
    }, 400);
    setSlide();
    const nextFrameNumber = position === TOTAL_POSITIONS ? 0 : Math.floor((TOTAL_FRAMES / TOTAL_POSITIONS) * position);
    nextFrame(nextFrameNumber);
    position += 1;
    if (position > TOTAL_POSITIONS) {
        position = 1;
    }
}

const setSlide = () => {
    const nextSlide = document.getElementById(`slide-${slideSwitcher ? 2 : 1}`);
    nextSlide.style.zIndex = 10;
    nextSlide.children[0].children[0].innerHTML = `"${slides[slide - 1].quote}"`;
    nextSlide.children[0].children[1].innerHTML = `- ${slides[slide - 1].author}`;
    if (slides[slide - 1].image) {
        nextSlide.children[0].children[2].style.backgroundImage = `url(./assets/quotes/${slides[slide - 1].image})`;
        nextSlide.children[0].children[2].classList.remove('hidden');
    } else {
        nextSlide.children[0].children[2].classList.add('hidden');
    }
    nextSlide.classList.add('show');
}

window.onload = async () => {
    const urlQueryParam = new URLSearchParams(window.location.search).get('q');
    if (urlQueryParam) {
        slide = parseInt(urlQueryParam) > 0 && parseInt(urlQueryParam) <= slides.length ? parseInt(urlQueryParam) : 1;
    } else {
        const url = new URL(window.location.href);
        url.searchParams.set('q', slide);
    }
    setTimeout(() => {
        const slideCount = document.getElementById('slide-count');
        slideCount.innerHTML = slide;
        setSlide();
        document.getElementById('slide-2').classList.remove('opacity-0');
        setTimeout(() => {
            document.getElementById('slide-1').classList.remove('opacity-0');
            document.getElementById('next-button').classList.remove('opacity-0');
            slideCount.classList.remove('hidden');
        }, 400);
    }, 400);
    //nextFrame(0);
    document.getElementById('next-button')
        .addEventListener('click', nextPosition);
}

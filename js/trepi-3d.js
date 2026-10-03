(function () {
  const fit = document.querySelector('.t3d-fit');
  if (!fit || typeof gsap === 'undefined') return;

  const stage = fit.querySelector('.t3d-stage');
  const sway = fit.querySelector('.t3d-sway');
  const tilt = fit.querySelector('.t3d-tilt');
  const $ = (sel) => fit.querySelectorAll(sel);

  // Scale the fixed 480x600 stage to the container width.
  function resize() {
    stage.style.setProperty('--s', fit.clientWidth / 540);
  }
  resize();
  new ResizeObserver(resize).observe(fit);

  const plugins = [window.ScrollTrigger, window.MotionPathPlugin].filter(Boolean);
  gsap.registerPlugin(...plugins);

  // Depth of each layer (px along z).
  const Z = { agent: 90, ring: 55, trepi: 120, plate: 0, beam: 50, back: 70 };
  gsap.set('.t3d-agent', { z: Z.agent });
  gsap.set('.t3d-ring', { z: Z.ring });
  gsap.set('.t3d-trepi', { z: Z.trepi });
  gsap.set('.t3d-beam', { z: Z.beam });
  gsap.set('.t3d-back', { z: Z.back });

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const chips = gsap.utils.toArray($('.t3d-chip'));

    // Entrance: layers fly in from the depth, once the scene is visible.
    const entrance = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 1 } });
    entrance
      .from('.t3d-floor', { autoAlpha: 0, duration: 1.2 })
      .from('.t3d-plate', { autoAlpha: 0, z: -260, y: 40 }, 0.1)
      .from('.t3d-trepi', { autoAlpha: 0, z: -300, y: 40 }, 0.25)
      .from('.t3d-ring', { autoAlpha: 0, scale: 0.2 }, 0.4)
      .from('.t3d-agent', { autoAlpha: 0, z: -300, y: -40 }, 0.55)
      .from('.t3d-beam', { autoAlpha: 0, duration: 0.6, stagger: 0.12 }, 0.7)
      .from('.t3d-back', { autoAlpha: 0, duration: 0.8 }, 0.9)
      .from(chips, { autoAlpha: 0, z: -140, y: 20, stagger: 0.07, duration: 0.7 }, 0.5);

    const loops = [];

    // Idle camera sway + floating cards.
    loops.push(gsap.fromTo(sway, { rotationY: -13, rotationX: 4 },
      { rotationY: 13, rotationX: -3, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    loops.push(gsap.to('.t3d-trepi', { y: -7, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    loops.push(gsap.to('.t3d-agent', { y: -5, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5 }));

    // Gyroscope rings around MCP.
    loops.push(gsap.to('.t3d-ring .r1', { rotationY: 360, duration: 4, ease: 'none', repeat: -1 }));
    loops.push(gsap.to('.t3d-ring .r2', { rotationX: 360, duration: 5, ease: 'none', repeat: -1 }));
    loops.push(gsap.to('.t3d-ring .r3', { rotation: -360, duration: 12, ease: 'none', repeat: -1 }));

    // Request flow: agent -> MCP -> Trepi -> channels, then channels light up.
    const beams = gsap.utils.toArray($('.t3d-beam'));
    const flow = gsap.timeline({ repeat: -1, repeatDelay: 0.4, paused: true });
    beams.forEach((beam, i) => {
      const pk = beam.querySelector('.pk');
      flow.fromTo(pk, { y: 0, autoAlpha: 1, scale: 1 },
        { y: beam.offsetHeight, duration: 0.7, ease: 'power1.in' }, i * 0.75)
        .to(pk, { autoAlpha: 0, scale: 2.2, duration: 0.2 }, '>');
    });
    flow.fromTo('.t3d-trepi .face', { filter: 'brightness(1)' },
      { filter: 'brightness(1.6)', duration: 0.25, yoyo: true, repeat: 1 }, 1.45);
    chips.forEach((chip, i) => {
      flow.to(chip, { z: 36, duration: 0.3, ease: 'back.out(2.5)', onStart: () => chip.classList.add('lit'),
        onReverseComplete: () => chip.classList.remove('lit') }, 2.3 + i * 0.3)
        .to(chip, { z: 0, duration: 0.5, ease: 'power2.inOut', onComplete: () => chip.classList.remove('lit') }, 2.9 + i * 0.3);
    });
    loops.push(flow);

    // Opportunities flowing back from Trepi to the agent along the dashed path.
    const back = $('.t3d-back .pk');
    if (window.MotionPathPlugin && back.length) {
      back.forEach((pk, i) => {
        loops.push(gsap.to(pk, {
          motionPath: { path: '#t3d-back-path', align: '#t3d-back-path', alignOrigin: [0.5, 0.5] },
          duration: 3.4, ease: 'none', repeat: -1, delay: i * 1.7,
        }));
      });
    }

    const start = () => { entrance.play(); entrance.eventCallback('onComplete', () => loops.forEach((l) => l.play())); };
    loops.forEach((l) => l.pause());
    if (window.ScrollTrigger) {
      ScrollTrigger.create({ trigger: fit, start: 'top 85%', once: true, onEnter: start });
    } else {
      start();
    }

    // Pointer parallax (mouse/pen only).
    const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const move = (e) => {
      if (e.pointerType === 'touch') return;
      const r = fit.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 30);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 20);
    };
    const leave = () => { rx(0); ry(0); };
    fit.addEventListener('pointermove', move);
    fit.addEventListener('pointerleave', leave);

    return () => {
      fit.removeEventListener('pointermove', move);
      fit.removeEventListener('pointerleave', leave);
      loops.forEach((l) => l.kill());
    };
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(sway, { rotationY: -12, rotationX: 3 });
  });
})();

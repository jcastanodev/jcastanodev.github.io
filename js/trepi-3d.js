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

    const start = () => { entrance.restart(); entrance.eventCallback('onComplete', () => loops.forEach((l) => l.play())); };
    loops.forEach((l) => l.pause());
    const modal = fit.closest('dialog');
    const onModalOpen = () => start();
    const onModalClosed = () => { loops.forEach((l) => l.pause()); entrance.pause(0); };
    if (modal) {
      // Inside the modal: play the entrance every time it opens.
      entrance.progress(0);
      modal.addEventListener('trepi:open', onModalOpen);
      modal.addEventListener('trepi:closed', onModalClosed);
    } else if (window.ScrollTrigger) {
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
      if (modal) { modal.removeEventListener('trepi:open', onModalOpen); modal.removeEventListener('trepi:closed', onModalClosed); }
      loops.forEach((l) => l.kill());
    };
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(sway, { rotationY: -12, rotationX: 3 });
  });
})();

// Expandable "+" panel: webhooks flow and platform integrations.
(function () {
  const root = document.querySelector('.t3x');
  if (!root) return;
  const btn = root.querySelector('.t3x-btn');
  const panel = root.querySelector('.t3x-panel');
  const plus = root.querySelector('.t3x-plus');
  const setExpanded = (v) => btn.setAttribute('aria-expanded', String(v));

  // Plain toggle, open by default (no GSAP, or reduced motion).
  function simpleToggle() {
    const onClick = () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      panel.style.display = open ? '' : 'none';
      setExpanded(open);
    };
    btn.addEventListener('click', onClick);
    return () => btn.removeEventListener('click', onClick);
  }

  if (typeof gsap === 'undefined') { simpleToggle(); return; }

  const q = (sel) => gsap.utils.toArray(root.querySelectorAll(sel));
  // GSAP owns the transforms of these labels, so centre them with percentages instead of CSS.
  root.querySelector('.t3i').classList.add('is-gsap');
  gsap.set(q('.t3i-node, .t3i-agent, .t3i-badge, .t3i-hub, .t3i-cloudlabel'), { xPercent: -50, yPercent: -50 });

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: reduce)', simpleToggle);

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const lines = q('.t3i-line');
    const nodes = q('.t3i-node');
    const pks = q('.t3i-pk');
    let isOpen = false;

    gsap.set(panel, { height: 0 });
    gsap.set(pks, { autoAlpha: 0 });
    setExpanded(false);

    // Packets travel both ways along each connection: webhooks in, actions out.
    const loops = gsap.timeline({ paused: true });
    if (window.MotionPathPlugin) {
      pks.forEach((pk, i) => {
        const inbound = i % 2 === 0;
        loops.to(pk, {
          motionPath: { path: lines[i], align: lines[i], alignOrigin: [0.5, 0.5], start: inbound ? 1 : 0, end: inbound ? 0 : 1 },
          duration: 2 + (i % 3) * 0.4, ease: 'none', repeat: -1,
        }, 0);
      });
    }
    const floats = nodes.map((n, i) => gsap.to(n, { y: i % 2 ? -4 : 4, duration: 2 + i * 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true }));
    const refresh = () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); };

    const open = gsap.timeline({
      paused: true,
      onComplete: () => { if (isOpen) { loops.play(); floats.forEach((f) => f.play()); gsap.to(pks, { autoAlpha: 1, duration: 0.4 }); } refresh(); },
      onReverseComplete: refresh,
    });
    open
      .to(plus, { rotation: 45, duration: 0.4, ease: 'back.out(2)' }, 0)
      .to(panel, { height: 'auto', duration: 0.9, ease: 'power2.out' }, 0)
      .from('.t3x-card', { autoAlpha: 0, y: 30, duration: 0.6 }, 0.3)
      .from(q('.t3x-step'), { autoAlpha: 0, scale: 0.7, stagger: 0.12, duration: 0.4, ease: 'back.out(2)' }, 0.6)
      .from(q('.t3x-code .ln'), { autoAlpha: 0, x: -14, stagger: 0.14, duration: 0.3 }, 1.0)
      .from('.t3x-title', { autoAlpha: 0, y: 14, duration: 0.5 }, 1.2)
      .from('.t3i-cloud', { autoAlpha: 0, scale: 0.7, duration: 0.9, ease: 'power2.out' }, 1.3)
      .from('.t3i-hub', { scale: 0, duration: 0.6, ease: 'back.out(2.2)' }, 1.4)
      .from('.t3i-agent', { autoAlpha: 0, y: -24, duration: 0.6, ease: 'back.out(2)' }, 1.5)
      .from('.t3i-badge', { autoAlpha: 0, scale: 0, duration: 0.4, ease: 'back.out(3)' }, 2.0)
      .from('.t3i-cloudlabel', { autoAlpha: 0, y: 10, duration: 0.5 }, 2.2)
      .fromTo(lines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.07, duration: 0.7, ease: 'power1.out' }, 1.5)
      .from(nodes, { autoAlpha: 0, scale: 0.3, stagger: 0.07, duration: 0.5, ease: 'back.out(2)' }, 1.7);

    function toggle() {
      isOpen = !isOpen;
      setExpanded(isOpen);
      if (isOpen) {
        open.timeScale(1).play();
      } else {
        loops.pause();
        gsap.set(pks, { autoAlpha: 0 });
        floats.forEach((f) => f.pause());
        open.timeScale(1.8).reverse();
      }
    }
    btn.addEventListener('click', toggle);

    // Unfolds by itself when the user scrolls down to it (inside the modal, scrolling its own body).
    const modal = root.closest('dialog');
    let trigger = null;
    const arm = () => {
      if (trigger) trigger.kill();
      if (!window.ScrollTrigger) { if (!isOpen) toggle(); return; }
      trigger = ScrollTrigger.create({
        trigger: btn, scroller: modal ? modal.querySelector('.trepi-modal-body') : window,
        start: 'top 85%', once: true, onEnter: () => { if (!isOpen) toggle(); },
      });
    };
    const reset = () => {
      if (trigger) trigger.kill();
      loops.pause(); floats.forEach((f) => f.pause());
      gsap.set(pks, { autoAlpha: 0 });
      open.pause(0); isOpen = false; setExpanded(false);
    };
    if (modal) {
      modal.addEventListener('trepi:open', arm);
      modal.addEventListener('trepi:closed', reset);
    } else {
      arm();
    }

    return () => {
      btn.removeEventListener('click', toggle);
      if (modal) { modal.removeEventListener('trepi:open', arm); modal.removeEventListener('trepi:closed', reset); }
      if (trigger) trigger.kill();
      loops.kill(); open.kill(); floats.forEach((f) => f.kill());
    };
  });
})();

// "Conoce Trepi" button -> fullscreen modal with a reveal transition.
(function () {
  const modal = document.getElementById('trepi-modal');
  const openBtn = document.getElementById('trepi-open');
  if (!modal || !openBtn) return;
  const closeBtn = modal.querySelector('.trepi-close');
  const animated = typeof gsap !== 'undefined' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let origin = '50% 50%';
  let busy = false;

  const fire = (name) => modal.dispatchEvent(new CustomEvent(name));
  const content = () => gsap.utils.toArray(modal.querySelectorAll('.trepi-reveal'));

  function open() {
    if (busy || modal.open) return;
    const r = openBtn.getBoundingClientRect();
    origin = `${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height / 2)}px`;
    modal.showModal();
    requestAnimationFrame(() => modal.classList.add('is-shown'));
    modal.querySelector('.trepi-modal-body').scrollTop = 0;
    if (!animated) { fire('trepi:open'); return; }
    busy = true;
    gsap.set(content(), { autoAlpha: 0, y: 26 });
    gsap.timeline({ onComplete: () => { busy = false; } })
      .fromTo(modal, { clipPath: `circle(0px at ${origin})` }, { clipPath: `circle(150vmax at ${origin})`, duration: 0.85, ease: 'power3.inOut' })
      .to(content(), { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, 0.45)
      .add(() => fire('trepi:open'), 0.55)
      .set(modal, { clearProps: 'clipPath' });
  }

  function close() {
    if (busy || !modal.open) return;
    const done = () => { modal.classList.remove('is-shown'); modal.close(); fire('trepi:closed'); busy = false; openBtn.focus(); };
    if (!animated) { done(); return; }
    busy = true;
    modal.classList.remove('is-shown'); // fade the backdrop together with the circle
    gsap.timeline({ onComplete: done })
      .to(content(), { autoAlpha: 0, y: 14, duration: 0.25, stagger: { each: 0.03, from: 'end' } })
      .fromTo(modal, { clipPath: `circle(150vmax at ${origin})` }, { clipPath: `circle(0px at ${origin})`, duration: 0.7, ease: 'power3.inOut' }, 0.15);
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
})();

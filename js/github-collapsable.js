(function () {
  const wrapper = document.getElementById('github-activity-wrapper');
  if (!wrapper) return;

  const EXPANDED = '1400px';
  const COLLAPSED = '200px';
  let collapseTimer = null;
  let expanded = false;

  function expand() {
    clearTimeout(collapseTimer);
    wrapper.style.maxHeight = EXPANDED;
    expanded = true;
  }

  function scheduleCollapse() {
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      wrapper.style.maxHeight = COLLAPSED;
      expanded = false;
    }, 1000);
  }

  // Desktop hover
  wrapper.addEventListener('mouseenter', expand);
  wrapper.addEventListener('mouseleave', scheduleCollapse);

  // Desktop click → open GitHub (ignore synthetic click fired by mobile after touchend)
  wrapper.addEventListener('click', function () {
    if (Date.now() - lastTouchEnd < 500) return;
    window.open('https://github.com/jcastanodev', '_blank');
  });

  // Mobile: track touch movement to distinguish tap from scroll
  let touchMoved = false;
  let touchStartTime = 0;
  let lastTouchEnd = 0;
  let lastTap = 0;
  const TAP_MAX_MS = 250;

  wrapper.addEventListener('touchstart', function () {
    touchMoved = false;
    touchStartTime = Date.now();
  }, { passive: true });

  wrapper.addEventListener('touchmove', function () {
    touchMoved = true;
  }, { passive: true });

  wrapper.addEventListener('touchend', function () {
    lastTouchEnd = Date.now();
    if (touchMoved || Date.now() - touchStartTime > TAP_MAX_MS) return;

    const now = Date.now();
    if (now - lastTap < 300) {
      window.open('https://github.com/jcastanodev', '_blank');
    } else {
      if (expanded) {
        clearTimeout(collapseTimer);
        wrapper.style.maxHeight = COLLAPSED;
        expanded = false;
      } else {
        expand();
      }
    }
    lastTap = now;
  }, { passive: true });
})();

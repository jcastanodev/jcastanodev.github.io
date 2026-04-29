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

  // Mobile tap toggle + double tap to open GitHub
  let lastTap = 0;
  wrapper.addEventListener('touchstart', function (e) {
    e.preventDefault();
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
  }, { passive: false });
})();
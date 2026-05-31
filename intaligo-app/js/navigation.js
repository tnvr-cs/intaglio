let activeScreen = 'splash';
let activePane = 'dashboard';

export function getActivePane() {
  return activePane;
}

export function goTo(id) {
  if (activeScreen === id) return;
  const prev = document.getElementById('screen-' + activeScreen);
  const next = document.getElementById('screen-' + id);
  activeScreen = id;

  prev.classList.remove('active');
  prev.classList.add('exit');
  prev.style.pointerEvents = 'none';

  next.classList.add('active');
  next.style.pointerEvents = 'all';

  setTimeout(() => {
    prev.classList.remove('exit');
    prev.style.pointerEvents = '';
    next.style.pointerEvents = '';
  }, 520);
}

export function switchPane(id, el, onPaneChange) {
  if (activePane === id) return;
  const prev = document.getElementById('pane-' + activePane);
  const next = document.getElementById('pane-' + id);
  prev.classList.add('exit-left');
  next.classList.remove('exit-left');
  setTimeout(() => {
    prev.classList.remove('active', 'exit-left');
  }, 420);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      next.classList.add('active');
    });
  });
  activePane = id;
  document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
  el.classList.add('active');
  if (onPaneChange) onPaneChange(id);
}

export function resetPaneToDashboard() {
  document.querySelectorAll('.pane').forEach((p) => {
    p.classList.remove('active', 'exit-left');
  });
  document.getElementById('pane-dashboard').classList.add('active');
  activePane = 'dashboard';
  document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
  document.querySelector('.nav-link').classList.add('active');
}

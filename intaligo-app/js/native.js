import { getServerBase, isNativeApp, setServerBase } from './api.js';

export function initNativeShell() {
  if (!isNativeApp()) return;

  document.body.classList.add('is-native');

  // Show the box where you paste your PC's http://...:3000 address.
  const block = document.getElementById('native-server-setup');
  const input = document.getElementById('server-url');
  if (!block || !input) return;

  block.hidden = false;
  input.value = getServerBase();

  const save = () => setServerBase(input.value);
  input.addEventListener('change', save);
  input.addEventListener('blur', save);
}

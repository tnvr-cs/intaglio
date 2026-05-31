const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const capRoot = path.join(root, 'cap');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (fs.existsSync(capRoot)) fs.rmSync(capRoot, { recursive: true, force: true });
fs.mkdirSync(capRoot, { recursive: true });

copyDir(
  path.join(root, 'node_modules', '@capacitor', 'core', 'dist'),
  path.join(capRoot, 'core'),
);
copyDir(
  path.join(root, 'node_modules', '@capacitor', 'camera', 'dist', 'esm'),
  path.join(capRoot, 'camera'),
);

console.log('Copied Capacitor modules to cap/');

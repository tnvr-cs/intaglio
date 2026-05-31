const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (fs.existsSync(www)) fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(www, 'index.html'));
copyDir(path.join(root, 'css'), path.join(www, 'css'));
copyDir(path.join(root, 'js'), path.join(www, 'js'));
copyDir(path.join(root, 'assets'), path.join(www, 'assets'));

if (fs.existsSync(path.join(root, 'cap'))) {
  copyDir(path.join(root, 'cap'), path.join(www, 'cap'));
}

fs.mkdirSync(path.join(www, 'data'), { recursive: true });
const model = path.join(root, 'data', 'category-model.json');
if (fs.existsSync(model)) {
  fs.copyFileSync(model, path.join(www, 'data', 'category-model.json'));
}

console.log('Copied web assets to www/');

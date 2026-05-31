const fs = require('fs');
const path = require('path');

const manifestPath = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
);

if (!fs.existsSync(manifestPath)) {
  console.warn('patch-android: AndroidManifest not found (run android:setup first)');
  process.exit(0);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

function addPermission(name) {
  if (!xml.includes(name)) {
    xml = xml.replace(/(<manifest[^>]*>)/, `$1\n    <uses-permission android:name="${name}" />`);
  }
}

addPermission('android.permission.CAMERA');
addPermission('android.permission.READ_MEDIA_IMAGES');
addPermission('android.permission.READ_EXTERNAL_STORAGE');

if (!xml.includes('android.hardware.camera')) {
  xml = xml.replace(
    /(<manifest[^>]*>)/,
    '$1\n    <uses-feature android:name="android.hardware.camera" android:required="false" />',
  );
}

if (!xml.includes('usesCleartextTraffic')) {
  xml = xml.replace(
    /<application/,
    '<application android:usesCleartextTraffic="true"',
  );
}

fs.writeFileSync(manifestPath, xml);
console.log('Patched AndroidManifest (camera, gallery, cleartext HTTP)');

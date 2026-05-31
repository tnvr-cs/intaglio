const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const flavor = process.argv[2] === 'release' ? 'assembleRelease' : 'assembleDebug';
const androidDir = path.join(__dirname, '..', 'android');
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

const env = { ...process.env };
if (!env.JAVA_HOME) {
  const studioJbr = [
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Android\\Android Studio\\jre',
  ].find((p) => fs.existsSync(p));
  if (studioJbr) env.JAVA_HOME = studioJbr;
}

const r = spawnSync(gradlew, [flavor], {
  cwd: androidDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (r.status === 0) {
  const sub = flavor === 'assembleRelease' ? 'release' : 'debug';
  console.log(`\nAPK: android/app/build/outputs/apk/${sub}/`);
}

process.exit(r.status ?? 1);

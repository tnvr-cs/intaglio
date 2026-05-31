# Android APK (intaglio)

The APK bundles the UI. For **phone-only use**, tap **Continue offline** on sign-in — data is saved on the device (no PC server). To sync with accounts on your computer, use **Sign in** and set **Server** to your PC URL.

## One-time setup

1. Install [Node.js](https://nodejs.org/).
2. Install [Android Studio](https://developer.android.com/studio) (includes the Android SDK and a 64-bit JDK).
3. Builds need **Java 17+** (not the old 32-bit Java 8). The build script tries Android Studio’s bundled JDK automatically; if builds fail, set `JAVA_HOME` to e.g. `C:\Program Files\Android\Android Studio\jbr`.
4. In this folder:

   ```bash
   npm install
   npm run android:setup
   ```

   `android:setup` adds the Android project (already done in this repo after first setup).

## Build a debug APK (install on your phone)

1. **Build the APK** (no server needed for offline mode):

   ```bash
   npm run apk:debug
   ```

2. Copy the APK to your phone and open it:

   `android/app/build/outputs/apk/debug/app-debug.apk`

   Or install with USB debugging:

   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

3. **First launch**: tap **Continue offline** (optional name). Your months are stored on the phone. Rebuild the APK after code changes with `npm run apk:debug`.

### Optional: sign in via your PC

1. Run `npm start` on your PC and note the network URL (e.g. `http://192.168.1.42:3000`).
2. Same Wi‑Fi on phone, enter that URL under **Server**, then **Sign in**.

## Open in Android Studio (optional)

```bash
npm run android:open
```

Then **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Release APK (smaller, for yourself)

```bash
npm run apk:release
```

Output: `android/app/build/outputs/apk/release/app-release-unsigned.apk`  
(Unsigned APKs may need “Install unknown apps” enabled on the phone.)

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Can’t sign in | Using server mode? PC running `npm start`, correct **Server** URL, same Wi‑Fi? Or use **Continue offline** |
| Lost offline data | Cleared app storage or uninstalled? Offline data is only on the device |
| Camera scan fails | Allow **Camera** (and **Photos**) for intaglio in Android Settings → Apps. Rebuild APK after code changes. |
| Windows firewall | Allow Node/port **3000** on private networks |
| Build fails | Open Android Studio once; install SDK Platform 34+ |

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run build:www` | Copy web files into `www/` |
| `npm run cap:sync` | Refresh `www/` and sync to Android |
| `npm run apk:debug` | Build debug APK |
| `npm run apk:release` | Build release APK (unsigned) |
| `npm run android:open` | Open project in Android Studio |

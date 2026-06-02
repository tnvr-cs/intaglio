# Intaglio

## Run in the browser

1. Install [Node.js](https://nodejs.org/).
2. In this folder:

```bash
npm install
npm start
```

3. Open http://localhost:3000

Accounts live in `users.txt` (format: `email|password|name`). Each user’s data is saved under `data/`.

## Inky display (Raspberry Pi)

The dashboard can export the visualization to a [Pimoroni Inky Impression 7"](https://shop.pimoroni.com/products/inky-impression-7) via a small Flask server on the Pi.

### On the Pi

1. Install dependencies (Python 3 on Raspberry Pi OS):

```bash
pip install flask pillow inky
```

2. From the repo root, start the display server:

```bash
python raspberriPi.py
```

It listens on port **5000** on all interfaces (`0.0.0.0`). Leave this running while you use Export Inky.

3. Note the Pi’s LAN IP (e.g. `192.168.0.42`):

```bash
hostname -I
```

### In the app

1. Open the dashboard sidebar.
2. In **Inky Pi**, enter `http://<pi-ip>:5000` (use the numeric IP — `raspberrypi.local` often fails on Windows).
3. Click **Export Inky** — the PNG is saved locally and POSTed to the Pi to refresh the display.

If the Pi is unreachable, you still get the PNG download; check that `raspberriPi.py` is running and the IP is correct.

## Other options

- **Demo** — try the app without an account.
- **Offline** — no server; data stays in the browser (or on the phone in the app).
- **Android** — see [ANDROID.md](ANDROID.md) for building an APK.

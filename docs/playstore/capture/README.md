# Capture notes

`shots.json` is a reproducible shot list for `capture.mjs` covering the four in-app screens (reminders list, places list, map, add-reminder) plus the dark-mode variant of the places list — matching the five full-size screenshots under `assets/screenshots/phone/`.

How these screenshots were actually produced, for anyone re-running this:

- **Sample data**: seeded through the app's own Settings → Backup & Restore → Restore from file, from a backup JSON matching `BackupPayload` (`src/services/backup.ts`) with five fictional places (Home, Work, Gym, Supermarket, Pharmacy) around Bengaluru and four reminders, matching the people/places already used in `docs/design/app-design_light.png` and `app-design_dark.png`.
- **Map shot**: the map needs a few seconds after navigating to it for Google Maps tiles to finish loading — `capture.mjs`'s `wait` step after the tap accounts for this; a capture taken too early shows a blank beige canvas.
- **`screenshot-05-notification.png`** was **not** produced via `shots.json`/`capture.mjs`. It was captured manually: enable Developer Mode (tap the app logo 10× on Settings → About), use Settings → Test Notification → Raise immediately, pull down the system notification shade (`adb shell cmd statusbar expand-notifications`), screenshot, then crop out the emulator-only system notifications below it (`Set a screen lock`, `Virtual SD card`, `Serial console enabled`) that have nothing to do with the app. This is a real OS notification from the app's own test-notification feature, not a mock-up — but the exact crop isn't scripted here.
- **Aspect ratio**: Pixel 7 captures are 1080×2400 (20:9), which exceeds Play's "long side ≤ 2× short side" screenshot rule. Each full-size shot here was padded (not cropped) to 1200×2400 with the screen's own background color, so no UI is lost — see the padding step in `SKILL.md` if regenerating.

# ADR-0001: Use the `SCHEDULE_EXACT_ALARM` permission for delayed reminders

| Field      | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| Status     | Accepted                                                     |
| Date       | 2026-10-02                                                   |
| Related    | Issue #78, PR #84 (`fix/78-delayed-notification-timing`)     |
| arc42 part | Section 9 – Architecture Decisions                           |

## Context

At Place reminds you about something when you arrive at, or leave, a saved
place. Early on we found that firing the reminder the instant a geofence was
crossed was annoying: if you simply drove past your office or supermarket,
your phone would buzz even though you never stopped there.

To fix this, we added an **Arrival Delay** and a **Leave Delay**
(Settings > Notifications). You can choose 0, 1, 3, 5 or 10 minutes, and the
default is 3 minutes. When you cross a geofence, the app doesn't show the
notification right away. Instead it asks Android to show it a few minutes
later. If you leave again before that time is up, the app cancels the
notification, because you were only passing through.

This means the reminder is really a **timed notification** that Android has
to deliver at the right moment, even if the app is closed and the phone is
sitting idle in your pocket.

### What went wrong

After the delay feature shipped, users noticed reminders arriving several
minutes later than the delay they had chosen (issue #78). A 3-minute delay
could turn into 8 or 10 minutes.

The cause was Android's battery-saving behaviour:

- Android has two kinds of alarms: **exact** alarms, which fire on time, and
  **inexact** alarms, which the system is allowed to postpone and bundle
  together to save battery.
- From Android 12 onwards, apps need the `SCHEDULE_EXACT_ALARM` permission to
  set exact alarms. Without it, `expo-notifications` quietly falls back to an
  inexact alarm.
- When the phone is idle (Doze mode), inexact alarms can be held back for
  several minutes.

So the delayed reminder was being treated as "deliver whenever convenient",
which is the opposite of what a "you're at the shop now" reminder needs.

### Forces and constraints

- **Timeliness matters.** A reminder that arrives after you've already left
  the shop is worthless. Accuracy to within a minute or so is part of the
  product promise ("Reliable notifications" in our goals).
- **Local-first, no backend.** We can't use server push to wake the phone.
  Everything has to be scheduled on the device.
- **Expo managed workflow.** We prefer solutions that work with existing Expo
  APIs rather than custom native code.
- **Battery and privacy.** We don't want to keep the app running in the
  background just to watch a clock.
- **Google Play policy.** Play restricts which apps may declare exact-alarm
  permissions, so we have to pick the one that fits our use case.

## Decision

We declare the **`SCHEDULE_EXACT_ALARM`** Android permission in
`app.config.js`, so that `expo-notifications` schedules delayed arrival and
leave reminders with exact alarms.

Because Android handles this permission differently by version, we also:

- **Android 12 and 13:** rely on the permission being granted automatically
  when the app is installed. Nothing more is needed.
- **Android 14 and later:** the permission is no longer granted by default
  for new installs, and the user has to turn it on themselves. We added an
  **Exact timing** row under Settings > Notifications that opens the
  system's "Alarms & reminders" screen
  (`openExactAlarmSettings` in `src/services/notifications.ts`). If a device
  doesn't have that screen, we open the app's general settings page instead
  so the button always does something.
- **iOS and web:** this permission does not apply; the code path is a no-op.

Immediate reminders (delay set to 0) don't use alarms at all and are shown
straight away, so they are unaffected by this decision.

## Alternatives considered

### 1. Do nothing and accept inexact timing

The simplest option, with no new permission. Rejected because reminders that
are several minutes late defeat the point of a location reminder, and users
were already reporting it as a bug.

### 2. Use `USE_EXACT_ALARM` instead

`USE_EXACT_ALARM` is granted automatically and can't be revoked by the user,
which sounds easier. However, Google Play only allows it for apps whose
**core purpose** is being an alarm clock or a calendar. At Place is a
location reminder app, so declaring it would risk the app being rejected
from the Play Store. Rejected.

### 3. Keep the app awake with a foreground service or timer

We could keep a JavaScript timer running in a foreground service until the
delay ends. Rejected because it uses more battery, shows a persistent
notification, is harder to make reliable when the OS kills the app, and adds
complexity for a solo-maintained project.

### 4. Remove the delay feature

Fire the notification immediately on every geofence crossing. This avoids
alarms entirely, but brings back the drive-through problem the delay was
built to solve. Rejected.

## Consequences

### Positive

- Delayed reminders are delivered on time, even when the phone is idle.
- The drive-through protection keeps working as designed: wait a few
  minutes, then notify, or cancel if you've left.
- No extra dependency, no custom native module, and no background service.
  It is a single manifest permission plus one settings link.
- It stays compatible with Google Play policy, since `SCHEDULE_EXACT_ALARM`
  is the permission intended for user-facing reminders.

### Negative and risks

- **Extra step on Android 14+.** Users on newer phones must turn on
  "Alarms & reminders" themselves. If they don't, the app still works but
  delayed reminders may arrive late, as before. We don't block the user or
  nag them about it.
- **The user can revoke it.** On Android 12+ the user can switch the
  permission off at any time. When that happens, Android cancels the app's
  pending exact alarms, and new ones fall back to inexact timing.
- **One more permission in the Play listing.** Some privacy-minded users look
  at the permission list. We think this is acceptable because the permission
  only lets the app schedule alarms. It gives no access to personal data.
- **OEM differences.** Some manufacturers rename or hide the "Alarms &
  reminders" screen, which is why the settings link falls back to the app's
  general settings page.

### Follow-ups to consider

- Show a hint in the app when exact alarms are not allowed on Android 14+,
  instead of relying on users to find the settings row.
- Use the Event Log's scheduled vs. delivered times (also added in PR #84)
  to check whether late deliveries still happen in practice.

## References

- `app.config.js` – permission declaration and explanation
- `src/services/notifications.ts` – `openExactAlarmSettings`, delayed
  scheduling with `TIME_INTERVAL` triggers
- `src/services/geofencing.ts` – arrival/leave delay and drive-through
  cancellation
- `src/screens/NotificationsSettingsScreen.tsx` – "Exact timing" row
  (Android 14+)
- Android developer docs: "Schedule alarms" and "Exact alarm permission"
  behaviour changes for Android 12 and 14

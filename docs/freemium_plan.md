# AtPlace Freemium Plan

| Attribute | Value |
|---|---|
| Status | Proposed |
| Date | 2026-11-21 |
| Decision Type | Monetization / Product |
| Platform | Android / Expo React Native |

## 1. Purpose

AtPlace currently ships as a fully-featured, free, local-first app with no backend and no monetization. This document proposes a freemium model: a generous free tier plus a single paid unlock ("AtPlace Pro") via in-app purchase, sized against (a) what comparable Play Store / App Store location-reminder apps actually charge, and (b) the real, usage-scaling cost of the Google Maps Platform APIs this app depends on. Nothing here should be implemented until the approach is confirmed — this is a planning document, not a build plan.

## 2. Current Implementation — Feature & Cost Inventory

Reviewed directly from the codebase (`src/`, `package.json`, `docs/adr/0002-*`):

| Feature (shipped today) | Where | Google Maps Platform cost? |
|---|---|---|
| Unlimited saved places, custom icon/color | `db/placesRepository.ts`, `types/place.ts` | None |
| Unlimited reminders per place | `db/remindersRepository.ts`, `types/reminder.ts` | None |
| Arrive **and** leave triggers (equal, single binary choice in the Add Reminder flow) | `components/TriggerOptionCard.tsx`, `types/reminder.ts` | None |
| Once vs. repeating reminders | `types/reminder.ts` (`ReminderRepeat`) | None |
| Per-reminder notification delay (0/1/3/5/10 min) | `app/reminder-delay.tsx` | None |
| Geofence monitoring (arrival/departure detection) | `expo-location` + `expo-task-manager`, Android native Geofencing API via Play Services | **None** — native OS geofencing is free; it is a Play Services capability, not a billed Maps Platform SKU |
| "Use current location" (GPS) | `services/location.ts` | None |
| Reverse geocoding (coordinates → address, for Select Location screen) | `services/location.ts` via `expo-location.reverseGeocodeAsync` | **None** — this calls the on-device/Play Services geocoder, not the billed Google Geocoding API |
| **Text address search** ("search an address" on Add Place) | `services/placesSearch.ts` → `https://places.googleapis.com/v1/places:searchText` | **Yes — billed per request**, see §4 |
| Map view (all places / pick-on-map) | `app/(tabs)/map.tsx`, `add-place/map.tsx`, `SelectLocationScreen`, `expo-maps` (Google Maps SDK for Android) | **Yes — billed per map load**, see §4 |
| Backup & restore to file | `app/settings-backup.tsx`, `expo-file-system`, `expo-document-picker` | None |
| Dark mode | `store/themeStore.ts` | None |
| Event log / delivery diagnostics (Developer Mode) | `services/logger.ts`, `services/deliveryDiagnostics.ts`, `screens/LogsScreen.tsx` | None |

**Key finding:** almost every feature in the app today is free to run forever (on-device geofencing, on-device reverse geocoding, local SQLite storage, local backup). The only two things Google actually bills AtPlace for are (1) **Places Text Search** when a user types an address, and (2) **rendering a Google Map** (map tiles/markers via the Maps SDK for Android). Any freemium/cost model should be built around those two operations specifically, not around features that cost nothing to run.

## 3. Competitive Research — What Comparable Apps Actually Charge

Researched live Play Store / App Store listings for direct competitors in the "location/geofence reminder" niche (2026):

| App | Free tier | Paid tier(s) | Model |
|---|---|---|---|
| **GeoReminder: Location Alerts** | Free app, limited reminders | $3.99/mo, $9.99/yr, or $19.99 lifetime (3-day trial) | Subscription + lifetime option |
| **Pinly: Smart Location Alerts** | 5 location pins, 3 timed + 3 simple reminders | $1.99/mo or $9.99/yr for unlimited | Subscription only |
| **WhereWhen** (Play Store) | Limited places/people/records | One-time purchase, unlocks unlimited places/people/records | **One-time, no subscription** |
| **LocaNotify** | Limited reminders | One-time purchase, unlimited geo-alert reminders | **One-time, no subscription** |
| **Geo-reminders (Simple & Usable)** | Limited reminders | "Super" IAP, $3.99 one-time, unlimited reminders | **One-time, no subscription** |
| **Geofency – Time Tracking** (broader time-tracking + automation use case) | Base app $4.99 | Additional IAPs for automation integrations | Paid-upfront + IAP |

**Pattern:** this is a narrow, single-purpose utility category, not a broad productivity suite. Three of six comparable apps monetize with a **single one-time unlock in the $3.99–$19.99 range** rather than a recurring subscription, and the subscription-based ones still offer a lifetime/annual option around $9.99–$19.99. This is consistent with general 2026 subscription benchmarks (Adapty/RevenueCat "State of Subscription Apps 2026"), which show productivity-adjacent single-utility apps converting better on a low, one-time or annual price point than on an aggressive weekly/monthly subscription — the broader $10–15/month productivity-suite pricing norm does not transfer well to a narrow single-feature utility like this one.

**Takeaway for AtPlace:** the free tier should stay genuinely useful (matching the "limited places/reminders, unlimited core behavior" shape competitors use), and the primary monetization lever should be a **one-time "AtPlace Pro" unlock**, not a recurring subscription — both because it matches what this specific niche's users are shown to accept, and because it fits AtPlace's own "local-first, no account, no nagging" positioning (`docs/website/overview.md`).

Sources: GeoReminder (apps.apple.com/us/app/id6751503939), Pinly (apps.apple.com/us/app/id6758637067), WhereWhen (play.google.com/store/apps/details?id=com.wherewhen.app), LocaNotify (apps.apple.com/app/id6755341757), Geo-reminders (apps.apple.com/us/app/id6475973471), Geofency (apps.apple.com/PK/app/id615538630); subscription benchmarks (RevenueCat "State of Subscription Apps 2026", Adapty "Productivity app subscription benchmarks").

## 4. Google Maps Platform Cost Analysis at Scale

AtPlace bills against two Google Maps Platform SKUs. Pricing below is current published Google Maps Platform pricing (post March 2025 billing change — free *usage caps* per SKU per month, replacing the old $200/mo credit, aggregated across the whole billing account, i.e. shared across **all** users, not granted per-user):

| SKU | Free cap | Price after cap (volume tiers) |
|---|---|---|
| **Places API — Text Search (Pro)**, used by `services/placesSearch.ts` | No meaningful free cap for the Pro tier (only the ID-only "Essentials" variant is free/unlimited) | $25.00 → $20.00 → $15.00 → $7.50 → $2.28 per 1,000 requests, by volume |
| **Maps SDK for Android — Dynamic Maps** (map loads), used by every `expo-maps` screen | 10,000 free map loads/month, account-wide | $7.00 → $5.60 → $4.20 → $2.10 → $0.53 per 1,000 loads, by volume |
| Geofencing (Android Geofencing API) | Unlimited, free | N/A — Play Services capability, not a Maps Platform SKU |
| Reverse geocoding (`expo-location`) | Unlimited, free | N/A — on-device/Play Services geocoder, not the billed Geocoding API |

**Illustrative cost model at scale** (order-of-magnitude, for planning purposes only):

- At **100,000 monthly active users**, assuming ~2 new places created per active user per month with ~3 search keystrokes/requests per place (≈6 Text Search requests/user/month): ≈600,000 requests/month. Even at the best realistic blended rate for an app this size (~$15–20/1,000), that's **roughly $9,000–12,000/month** from address search alone.
- The same 100,000 users opening the map tab/add-place map/select-location screen ~10 times/month each: ≈1,000,000 map loads/month, minus the 10,000 free cap, at a blended rate of ~$3–5/1,000 once the higher-volume discount tiers kick in: **roughly $3,000–5,000/month**.
- Geofencing and reverse geocoding remain **$0** regardless of user count — this is a direct consequence of decisions already made in the current implementation (native geofencing + on-device geocoding instead of Google's billed Geolocation/Geocoding APIs), and should be preserved.

**Implication:** Text Search (address search) is the single largest, fastest-scaling cost, and — unlike map loads — it has essentially no free allowance. It scales with the number of places free users create, not with how "premium" they are. This directly shapes the free/paid split in §5–6: the free tier should cap the thing that drives this cost (place creation via search), while steering free users toward the already-free alternatives (GPS "use current location" and "pick on map," both $0).

A second implication: because map-load cost accrues from the *existing, already-converted-or-not* install base every month forever, a **one-time purchase alone does not scale with ongoing cost** the way a subscription would. The free-tier caps in §5 (place/search limits) are deliberately sized to bound this exposure per free user, independent of the purchase model.

Sources: Google Maps Platform pricing (developers.google.com/maps/billing-and-pricing/pricing), Maps SDK for Android usage & billing (developers.google.com/maps/documentation/android-sdk/usage-and-billing), Places API usage & billing (developers.google.com/maps/documentation/places/web-service/preview-billing), March 2025 billing change notes (developers.google.com/maps/billing-and-pricing/march-2025).

## 5. Proposed Free Tier

Free, forever, no account required — stays true to AtPlace's local-first positioning:

- Up to **3 saved places**
- Up to **5 reminders per place**
- Both arrival and leave triggers, once or repeating — kept as-is; these are $0 to run and are a single binary choice already baked into the Add Reminder screen, so paywalling one side of that choice would be a confusing, punitive UX rather than a real cost control
- Per-reminder notification delay options
- "Use current location" and "pick on map" for adding a place — both **free to AtPlace** (no Maps Platform billing), so unlimited for everyone
- **Address text search capped at 10 searches/month** — this is the one operation that actually costs AtPlace money per use (§4); capping it bounds exposure per free user without removing the feature
- Single-place map preview
- Dark mode
- Event log / Developer Mode diagnostics

## 6. Proposed Premium Tier — "AtPlace Pro"

Unlocked via a single in-app purchase:

- **Unlimited saved places**
- **Unlimited reminders per place**
- **Unlimited address search**
- **Backup & restore** (export/import to file) — gates a feature that costs $0 to run but is a recognized high-value "peace of mind" feature in this category (mirrors how Todoist and similar apps gate data export/import), and gives the paid tier something tangible beyond raw limits
- **Full map view** showing all places at once with live geofence radius overlays (vs. single-place preview in free)
- Custom per-place geofence radius control, once a radius-picker UI exists (`types/place.ts` already models `radius`; no picker UI today — track as a Pro feature for when it ships)
- Early access to new features (e.g. widgets, multiple geofence shapes) as they land

No ads. AtPlace's positioning is explicitly privacy-first and local-first; third-party ad SDKs require network calls and data sharing that conflict with that promise and with the "no backend" architecture. Monetize via the one-time unlock only.

## 7. Proposed Pricing

Primary: **one-time "AtPlace Pro" unlock, $4.99 USD** (India: ₹299, with Play Console's automatic regional price-tiering applied for other markets).

Rationale:
- Sits inside the $3.99–$19.99 range comparable apps charge (§3), on the lower end to reflect that AtPlace's core loop (arrive/leave reminders) stays fully free and unlimited — Pro is a limits-and-convenience upgrade, not a feature-unlock for basic functionality.
- A one-time purchase matches the pattern set by the closest direct Play Store competitor (WhereWhen) and two of the App Store competitors (LocaNotify, Geo-reminders), and avoids subscription fatigue in a single-purpose utility category where 2026 benchmark data shows weekly/monthly subscriptions underperform for this kind of app.
- Avoids an ongoing billing relationship that would require server-side receipt/subscription management — consistent with the "no backend" architecture goal in `CLAUDE.md`.

Secondary (optional, add only if conversion data shows one-time pricing underperforms): an annual option at **$2.99/year** for price-sensitive markets, capped so it never exceeds the one-time price's lifetime value — not recommended at launch; revisit after real usage data exists.

## 8. Implementation Notes (for a future task, not this one)

- Use **Google Play Billing** via a maintained Expo-compatible library (e.g. `react-native-iap`'s Expo config plugin) — per the Dependency Policy in `CLAUDE.md`, confirm it's still actively maintained and Expo-managed-workflow-compatible at implementation time; there is no first-party Expo IAP API today.
- Entitlement can be verified client-side against the Play Billing purchase token and cached locally (e.g. a `isPro` flag in `store/settingsStore.ts`-style Zustand store, persisted to SQLite/AsyncStorage) — no custom backend needed, matching the local-first architecture. Accept the small piracy risk this implies as proportionate for an indie, low-price utility app.
- Enforce the free-tier place/reminder/search caps in the relevant repositories/stores (`db/placesRepository.ts`, `db/remindersRepository.ts`, `services/placesSearch.ts`) rather than only in the UI, so limits hold even if a screen is skipped.
- This is a **Medium/High severity change** by the project's own impact-analysis rubric once implementation starts (new store/service logic, new dependency, paywall UX across several screens) — run `impact-analysis` again and confirm the approach before writing code.

## 9. Open Questions for the User

- Confirm the free-tier numeric limits (3 places / 5 reminders each / 10 searches per month) before implementation — these are proposed starting points based on competitor patterns and the cost model in §4, not fixed.
- Confirm $4.99 one-time as the launch price, or whether to A/B a lifetime-vs-subscription offer once there's real install volume to test against.
- Decide whether existing pre-launch testers/early users should be grandfathered into Pro for free (recommended, given the app has no public release yet per `docs/website/overview.md`'s "In active development" status).

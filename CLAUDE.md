# CLAUDE.md

Guidance for Claude when working in this repository.

Always follow all rules defined in `.claude/rules/` (e.g. UI/design, API, git commit rules) in addition to the guidance in this file.

## Impact Analysis (Required Before Every Task)

Before starting any task — before writing or editing any code — invoke the `impact-analysis` skill (`.claude/skills/impact-analysis/SKILL.md`). It assesses scope, business-logic changes, breaking changes, and data/migration risk, and reports severity (Low/Medium/High) before implementation begins.

For Medium or High severity findings, pause and confirm the approach with the user before making changes. Trivial Low-severity tasks only need a one-line note, not a full report.

## Project Overview

`AtPlace` is a location-based reminder app that reminds you about things to do when you arrive at a specific place.

Primary goals:

- Location-based reminders — Trigger reminders automatically when the user reaches a specific location.
- Simple reminder creation — Let users quickly create a reminder and associate it with a place.
- Save frequently used places — Allow users to save locations such as Home, Work, School, or custom places.
- Reliable notifications — Deliver timely notifications when the user enters the relevant location.
- Easy location management — Make it simple to select, edit, rename, and remove saved locations.
- Privacy-focused — Use location data only as needed to provide the reminder experience.
- Low effort, everyday utility — Help users remember what to do where, without requiring them to manually check their reminder list.

Target platform: **Android** (Expo / React Native).

---

## Technology Stack

| Area             | Technology                          | Purpose                                          |
| ---------------- | ----------------------------------- | ------------------------------------------------ |
| Mobile App       | React Native                        | Cross-platform mobile application                |
| Language         | TypeScript                          | Type safety and maintainability                  |
| Framework        | Expo                                | Development, native APIs, builds and app tooling |
| Navigation       | Expo Router                         | File-based application navigation                |
| UI               | React Native + NativeWind           | User interface and styling                       |
| State Management | Zustand                             | Lightweight application state                    |
| Local Storage    | Expo SQLite                         | Store reminders, locations and settings          |
| Location         | Expo Location                       | Access device location                           |
| Geofencing       | Expo Location / Native capabilities | Detect arrival at saved locations                |
| Notifications    | Expo Notifications                  | Trigger local reminder notifications             |
| Maps             | React Native Maps                   | Select and display locations                     |
| Forms            | React Hook Form + Zod               | Form handling and validation                     |
| Testing          | Jest + React Native Testing Library | Unit and component testing                       |
| Build & CI/CD    | EAS Build + GitHub Actions          | Automated application builds                     |
| Backend          | None initially                      | Keep the first version local-first               |

## Core Components

### Reminders

Reminders contain information such as:

- Reminder title
- Associated location
- Trigger radius
- Active/inactive status
- Optional recurrence or scheduling information

Example:

```text
Office
└── Take laptop
```

### Saved Locations

Users can save frequently used locations such as:

- Home
- Work
- School
- Gym
- Supermarket
- Custom locations

Locations can be created either by:

- Saving the current location
- Selecting a location on the map

### Location Monitoring

The application will use device location services to determine when the user enters the configured area around a saved location.

For example:

```text
                 Office
                   📍
              ┌───────────┐
              │ Geofence  │
              │           │
              │   User →  │
              └───────────┘
                    │
                    ▼
              Trigger reminder
                    │
                    ▼
             🔔 Take laptop
```

### Notifications

Reminders will be delivered using local notifications.

Example:

> 📍 You're at Office
> **Don't forget to take your laptop.**

No server-side push notification is required for the initial implementation.

## Local-First Approach

The first version will not require:

- User accounts
- Cloud synchronization
- A backend server
- Database hosting
- Internet connectivity for normal reminder operation

This provides several benefits:

- Better privacy
- Lower infrastructure cost
- Offline support
- Simpler architecture
- Faster development

A backend can be introduced later if features such as account synchronization or multi-device support become necessary.

---

# Architecture Rules

Use a simple feature-oriented structure:

```text
src/
  screens/
  components/
  store/
  db/
  services/
  types/
  utils/
```

## Responsibilities

- `db/` → SQLite schema, migrations, repositories
- `services/` → notifications, backup, file handling
- `store/` → Zustand state stores
- `screens/` → UI screens
- `components/` → reusable UI components
- `types/` → shared TypeScript types

Avoid business logic directly inside screens.

---

# Coding Standards

- Prefer **functional React components**.
- Use **TypeScript types/interfaces** for all public structures.
- Prefer `async/await` over promise chains.
- Keep functions small and focused.
- Avoid deeply nested logic.
- Add comments only when intent is not obvious.
- Prefer composition over inheritance.

---

# UI Guidelines

- Mobile-first layout
- Large touch targets
- Clear spacing
- Native-looking interactions
- Support dark mode where practical
- Avoid heavy custom animations unless requested

---

# Dependency Policy

Before adding a dependency, verify:

1. Works with Expo managed workflow.
2. Actively maintained.
3. Solves a real problem.
4. Cannot be replaced by an existing Expo API.

Avoid adding dependencies for trivial utilities.

---

# Database Migrations

- Use explicit migration functions.
- Never drop user tables automatically.
- Preserve existing data during schema upgrades.
- Add new columns with sensible defaults.

---

# Error Handling

- Fail gracefully.
- Show user-friendly messages.
- Log unexpected errors in development.
- Avoid silent failures for file or database operations.

---

# Git Guidelines

- Keep commits focused.
- Use descriptive commit messages.
- Do not commit build artifacts.
- Do not commit credentials or API keys.
- Keep `README.md` updated when features change.

---

# Preferred Implementation Style

When multiple valid solutions exist, choose the one that is:

1. Simpler
2. Easier to maintain
3. More offline-friendly
4. More compatible with Expo
5. Easier for a solo developer to understand six months later

---

# Current Product Decision

The app name is **At Place**.

Use the following identifiers unless told otherwise:

- Package: `in.definestack.atplace`
- Repository: `at-place`

---

# When Unsure

Ask for clarification rather than making large architectural changes.

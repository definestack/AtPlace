# AtPlace

**Location-based reminders that trigger when you need them—right where you need them.**

AtPlace is a privacy-focused, location-based reminder app for Android that helps you remember tasks when you arrive at specific places. Save your frequently visited locations (Home, Work, Gym, etc.) and associate reminders with them. Using geofencing, AtPlace automatically detects when you enter a saved location and delivers timely notifications—no manual checking required.

## Features

- **Location-Based Reminders** — Reminders trigger automatically when you reach a saved location
- **Saved Places** — Save frequently visited locations for quick reminder creation
- **Geofencing** — Precise location detection with configurable trigger radius
- **Local Notifications** — Timely, contextual reminders delivered when you need them
- **Offline-First** — Works without internet; all data stays on your device
- **Privacy-Focused** — Location data is never sent to servers; used only for local geofencing
- **Easy Management** — Simple UI to create, edit, and manage reminders and locations

## Example Usage

```
Office (Saved Location)
└── Take laptop
    └── Triggers when you arrive within 200m radius

Home (Saved Location)
└── Buy groceries
    └── Triggers when you arrive home
```

When you enter the Office geofence, you'll see:

> 📍 You're at Office  
> **Don't forget to take your laptop.**

## Technology Stack

| Area             | Technology                | Purpose                              |
| ---------------- | ------------------------- | ------------------------------------ |
| Mobile Platform  | React Native + Expo       | Cross-platform Android development   |
| Language         | TypeScript                | Type safety and maintainability      |
| Navigation       | Expo Router               | File-based app navigation            |
| UI & Styling     | React Native + NativeWind | Component library and styling        |
| State Management | Zustand                   | Lightweight global state             |
| Local Storage    | Expo SQLite               | Reminders, locations, settings       |
| Location APIs    | Expo Location             | Device location access & geofencing  |
| Notifications    | Expo Notifications        | Local reminder notifications         |
| Maps             | Expo Maps                 | Location selection and display       |
| Forms            | React Hook Form + Zod     | Form handling and validation         |
| Testing          | Jest + React Native Testing Library | Unit and component tests |
| CI/CD            | EAS Build + GitHub Actions | Automated builds and deployments     |

## Architecture

AtPlace follows a simple, feature-oriented structure:

```
src/
├── screens/        # UI screens
├── components/     # Reusable UI components
├── store/          # Zustand state stores
├── db/             # SQLite schema, migrations, repositories
├── services/       # Notifications, backup, file handling
├── types/          # Shared TypeScript types
└── utils/          # Utility functions
```

**Design Principles:**
- Functional React components
- Business logic in services, not in screens
- Type-safe with TypeScript
- Local-first; no backend required for core functionality

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Android emulator or physical device

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/at-place.git
   cd at-place
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open in Expo Go or Android emulator:
   ```bash
   # Press 'a' in the terminal to open Android emulator
   # Or scan QR code with Expo Go on your device
   ```

## Project Structure

### Core Components

**Reminders**
- Title, associated location, and trigger radius
- Active/inactive status
- Optional recurrence or scheduling

**Saved Locations**
- Home, Work, School, Gym, or custom places
- Created by saving current location or selecting on map
- Configurable geofence radius

**Geofencing**
- Detects when user enters location boundary
- Triggers associated reminders automatically
- Low-power monitoring in background

**Notifications**
- Local (on-device) notifications
- Delivered when entering geofence
- No server infrastructure required

### Database

Reminders and locations are stored locally in SQLite. The database includes:
- User locations and coordinates
- Associated reminders and metadata
- Notification history
- User settings and preferences

## Development Guidelines

### Coding Standards
- Use **functional React components**
- Write **TypeScript** for all public structures
- Use **async/await** over promise chains
- Keep functions small and focused
- Avoid deeply nested logic
- Add comments only when intent is unclear

### UI/UX
- Mobile-first responsive design
- Large touch targets for mobile
- Clear spacing and typography
- Native-looking interactions
- Dark mode support

### Dependencies
Before adding a dependency, verify:
1. Works with Expo managed workflow
2. Actively maintained
3. Solves a real problem
4. Cannot be replaced by existing Expo APIs

### Database Migrations
- Use explicit migration functions
- Never drop user tables automatically
- Preserve data during schema upgrades
- Add new columns with sensible defaults

### Error Handling
- Fail gracefully with user-friendly messages
- Log errors in development
- Avoid silent failures for file/database operations

## Git Workflow

- Keep commits focused and descriptive
- Do not commit build artifacts or credentials
- Update README when features change
- Commit message format:
  ```
  [type]: Brief description
  
  Longer explanation if needed.
  ```

## Testing

Run tests with:
```bash
npm test
```

## Building for Release

### Android Build

Build an APK or AAB for release:
```bash
eas build --platform android --auto-submit
```

Refer to [EAS Build documentation](https://docs.expo.dev/build/introduction/) for detailed build options.

## Privacy & Security

- **No cloud storage** — All data remains on your device
- **No tracking** — Location data is never sent anywhere
- **Open source** — Community can audit the code
- **Minimal permissions** — Only requests location access when needed

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes with clear messages
4. Push to your fork and submit a pull request

Please ensure:
- Code follows the project standards
- New features have tests
- README is updated if needed
- Commits are focused and descriptive

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

## Support

For issues, questions, or suggestions:
- Open an [issue on GitHub](https://github.com/yourusername/at-place/issues)
- Check existing issues for similar problems
- Include steps to reproduce for bug reports

## Roadmap

### Current (MVP)
- ✅ Local reminder creation and management
- ✅ Saved locations
- ✅ Geofence-triggered notifications
- ✅ Offline-first architecture

### Future
- [ ] Reminder templates
- [ ] Multiple reminders per location
- [ ] Advanced geofence shapes
- [ ] Cloud sync (optional)
- [ ] Multi-device support
- [ ] Recurring reminders with scheduling
- [ ] Location history and analytics

---

**AtPlace** — Remember what. Remember where. Remember when it matters.

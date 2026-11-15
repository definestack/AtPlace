# ADR-001: Environment Configuration for Expo Android Production Builds

| Attribute | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-15 |
| Decision Type | Build & Release |
| Platform | Android / Expo React Native |
| Technology | Expo, dotenv-cli, Gradle |

## 1. Context

The application uses Expo and React Native with a native Android project.

Production builds are generated locally using Gradle:

```powershell
.\gradlew bundleRelease
```

The application requires environment-specific configuration, including:

- Production API endpoints.
- Google Maps API key.
- Other environment-specific application settings.

These values are maintained in `.env.production`.

Expo applications have two distinct stages where environment variables may be consumed:

1. **Native configuration:** Expo evaluates `app.config.ts` and applies config plugins during Prebuild.
2. **JavaScript bundling:** Metro processes the React Native application and substitutes `EXPO_PUBLIC_*` variables during the Gradle release build.

Loading environment variables for one stage does not automatically make them available to a separately executed build process.

We need a consistent mechanism to ensure that production configuration is used during both stages.

## 2. Decision

We will use **dotenv-cli** to explicitly load `.env.production` before executing Expo Prebuild and Gradle release build commands.

This provides a predictable and repeatable production build process without depending on implicit environment-file selection.

### 2.1 Install dotenv-cli

Install dotenv-cli as a development dependency:

```powershell
npm install --save-dev dotenv-cli
```

This will:

- Install dotenv-cli in `node_modules`.
- Add it to `devDependencies` in `package.json`.
- Update `package-lock.json`.

It is a build-time utility and is not required by the installed Android application.

### 2.2 Native Configuration – Expo Prebuild

When native configuration needs to be generated or synchronized, execute:

```powershell
npx dotenv -e .env.production -- npx expo prebuild --platform android
```

This ensures that production environment variables are available while Expo evaluates `app.config.ts` and executes config plugins.

Examples of native configuration that may depend on environment variables:

- Google Maps API key.
- Android application configuration.
- Native module configuration.
- Permissions and other config-plugin settings.

Prebuild is not required before every release. It should be executed when native configuration needs to be generated or synchronized.

Avoid using `--clean` unless intentionally regenerating the native project.

### 2.3 Android Production Build – Gradle

Execute the Gradle release build from the project root:

```powershell
npx dotenv -e .env.production -- .\android\gradlew.bat -p android :app:bundleRelease
```

This ensures that the production environment variables are available to Gradle and its child processes, including Metro.

Metro uses these variables when generating the JavaScript bundle.

The resulting Android App Bundle is generated at:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 3. Environment Variable Consumption

Environment variables are consumed at different stages depending on how they are referenced.

| Configuration | Consumption Stage |
|---|---|
| `GOOGLE_MAPS_API_KEY` referenced in `app.config.ts` | Expo Prebuild |
| `EXPO_PUBLIC_API_URL` | Metro JavaScript bundling |
| `EXPO_PUBLIC_ANALYTICS_KEY` | Metro JavaScript bundling |
| Native configuration values | Expo Prebuild |

Example `.env.production`:

```env
GOOGLE_MAPS_API_KEY=production-google-maps-key
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_ANALYTICS_KEY=production-analytics-key
```

Example usage in `app.config.ts`:

```typescript
export default {
  expo: {
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    }
  }
};
```

Example usage in application code:

```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

**Security consideration:** `EXPO_PUBLIC_*` variables are inlined into the JavaScript bundle and must never contain secrets. Google Maps API keys embedded in Android applications are also extractable and must be restricted using application ID and signing certificate SHA-1 restrictions.

## 4. Alternatives Considered

### Alternative 1: Rely on Expo's automatic environment loading

Expo CLI automatically loads environment files according to its environment-loading rules.

**Reason for not selecting:**

- Environment selection depends on the execution context and command.
- Prebuild and Metro have different execution stages.
- Explicitly selecting `.env.production` makes the build process easier to understand and reproduce.

### Alternative 2: Manually set environment variables in PowerShell

Example:

```powershell
$env:GOOGLE_MAPS_API_KEY="production-key"
$env:EXPO_PUBLIC_API_URL="https://api.example.com"
```

**Reason for not selecting:**

- Requires maintaining variables manually.
- Becomes cumbersome as the number of variables grows.
- Makes local and CI/CD build scripts less consistent.

### Alternative 3: Use EAS Build

Use Expo Application Services to perform production builds in the cloud.

**Reason for not selecting:**

- The project already maintains its native Android project.
- Local Gradle builds provide direct control over signing and native configuration.
- EAS Build is not necessary for the existing release workflow.

## 5. Consequences

### Positive

- Explicit production environment selection.
- Consistent environment configuration across Prebuild and Gradle.
- Reduced risk of accidentally using development API endpoints.
- Reproducible local and CI/CD build commands.
- No dependency on EAS Build.

### Negative / Considerations

- dotenv-cli becomes an additional development dependency.
- Both build stages must explicitly load the production environment.
- Developers must ensure `.env.production` is available locally or in CI/CD.
- Changes to native configuration may require another Prebuild execution.

## 6. Production Build Procedure

Execute the following commands from the project root.

**Step 1: Generate or synchronize native configuration when required**

```powershell
npx dotenv -e .env.production -- npx expo prebuild --platform android
```

**Step 2: Generate production Android App Bundle**

```powershell
npx dotenv -e .env.production -- .\android\gradlew.bat -p android :app:bundleRelease
```

**Step 3: Locate the generated artifact**

```text
android/app/build/outputs/bundle/release/app-release.aab
```

**Step 4: Publish**

Upload the generated AAB to Google Play Console for testing or production release.

## 7. Security and Repository Guidelines

- Commit `package.json` and `package-lock.json`.
- Do not commit environment files containing private configuration.
- Add `.env.production` to `.gitignore`.
- Store production configuration securely in GitHub Actions Secrets or another secure CI/CD configuration store.
- Never expose private credentials through `EXPO_PUBLIC_*` variables.
- Restrict Google Maps API keys appropriately.
- Protect the Android upload keystore and signing credentials.

## 8. Decision Summary

We will use `dotenv-cli` to explicitly load `.env.production` for both Expo Prebuild and Gradle release builds.

This establishes a predictable production configuration process while retaining local Gradle as the Android build mechanism.

The two commands are:

```powershell
npx dotenv -e .env.production -- npx expo prebuild --platform android
```

```powershell
npx dotenv -e .env.production -- .\android\gradlew.bat -p android :app:bundleRelease
```

**Status: Accepted**
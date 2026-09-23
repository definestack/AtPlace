// Guarantees the background geofence task is registered on every JS launch,
// including headless background relaunches (issue #37). Previously this
// module was only imported by `src/app/_layout.tsx` — a router layout
// component that never runs when Android relaunches the JS runtime to
// deliver a geofence transition in the background, so the task handler
// (`TaskManager.defineTask` in `src/services/geofencing.ts`) was never
// registered and no notification fired. Importing it here, ahead of the
// router entry, ensures registration happens unconditionally.
import "./src/services/geofencing";
import "expo-router/entry";

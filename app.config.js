/**
 * Converted from app.json (issue #6) so the Google Maps API key required by
 * `expo-maps` can be injected from an environment variable instead of being
 * committed to source control. Everything else is unchanged from app.json.
 *
 * Set GOOGLE_MAPS_API_KEY in a local `.env` (gitignored) for development
 * builds, and as an EAS secret for CI/EAS builds. See `.env.example`.
 */
module.exports = {
  expo: {
    name: "AtPlace",
    slug: "at-place",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "atplace",
    userInterfaceStyle: "automatic",
    android: {
      package: "in.definestack.atplace",
      adaptiveIcon: {
        backgroundColor: "#FAF6F0",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#FAF6F0",
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "AtPlace uses your location to save the place you're at.",
        },
      ],
      "expo-maps",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};

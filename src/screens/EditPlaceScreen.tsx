import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlaceDetailsForm } from "@/components/PlaceDetailsForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { usePlaceLocationPickStore } from "@/store/placeLocationPickStore";
import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";

/**
 * Edit Place screen (issue #87) — reached by tapping the Edit icon on a
 * Places tab row. The Place Details form (shared with Add Place via
 * `PlaceDetailsForm`), prefilled with the saved name/address, plus a
 * "Change Location" that reuses the map picker in `mode=pick` instead of
 * pushing into the Add Place flow. Only name, address and location are
 * editable — no radius, icon or color picker exists yet.
 *
 * Saving is a plain `updatePlace` (repo: a single `UPDATE … WHERE id = ?`)
 * — the place id never changes and `reminders` is never touched, so a
 * place's reminders keep their ids, settings and count. If the location
 * moved, `hydrateReminders` refreshes the joined place name on the
 * Reminders tab and feeds the root layout's `syncGeofences` effect
 * (`src/app/_layout.tsx`), which re-registers the geofence at the new
 * coordinates.
 */
export function EditPlaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ placeId?: string }>();

  const place = usePlacesStore((state) => state.places.find((p) => p.id === params.placeId));
  const updatePlace = usePlacesStore((state) => state.updatePlace);
  const hydrateReminders = useRemindersStore((state) => state.hydrate);
  const picked = usePlaceLocationPickStore((state) => state.picked);
  const consumePicked = usePlaceLocationPickStore((state) => state.consumePicked);

  const [name, setName] = useState(place?.name ?? "");
  const [address, setAddress] = useState(place?.address ?? "");
  const [latitude, setLatitude] = useState(place?.latitude);
  const [longitude, setLongitude] = useState(place?.longitude);
  const [saving, setSaving] = useState(false);

  // Apply a location picked via "Change Location" when this screen regains
  // focus — the address updates to the map's reverse-geocoded value, but the
  // user's own name is kept rather than overwritten.
  useFocusEffect(
    useCallback(() => {
      if (!picked) return;
      setLatitude(picked.latitude);
      setLongitude(picked.longitude);
      setAddress(picked.address);
      consumePicked();
    }, [picked, consumePicked]),
  );

  const handleChangeLocation = () => {
    router.push({
      pathname: "/add-place/map",
      params: {
        mode: "pick",
        latitude: String(latitude ?? ""),
        longitude: String(longitude ?? ""),
      },
    });
  };

  const handleSave = async () => {
    if (!place) return;
    if (!name.trim()) {
      Alert.alert("Name required", "Please give this place a name before saving.");
      return;
    }
    if (latitude === undefined || longitude === undefined) {
      Alert.alert("Missing location", "No location was selected for this place.");
      return;
    }

    setSaving(true);
    try {
      await updatePlace(place.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        latitude,
        longitude,
      });
      // Refresh the joined place name/address reminders carry, and feed the
      // root layout's geofence-sync effect in case the location moved.
      await hydrateReminders();
      router.back();
    } catch {
      Alert.alert("Couldn't save place", "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!place) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
        <ScreenHeader title="Edit Place" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-muted dark:text-mutedDark">
            That place could no longer be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Edit Place" onBack={() => router.back()} />
      <PlaceDetailsForm
        icon={place.icon}
        color={place.color}
        name={name}
        onNameChange={setName}
        address={address}
        onAddressChange={setAddress}
        onChangeLocation={handleChangeLocation}
        onSave={handleSave}
        saving={saving}
      />
    </SafeAreaView>
  );
}

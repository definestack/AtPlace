import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlaceDetailsForm } from "@/components/PlaceDetailsForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { usePlacesStore } from "@/store/placesStore";
import { useReminderFlowStore } from "@/store/reminderFlowStore";
import { generateId } from "@/utils/id";

/** Default icon/color for a newly saved place — no picker UI yet (future ticket). */
const DEFAULT_PLACE_ICON = "location";
const DEFAULT_PLACE_COLOR = "teal";

/**
 * Place Details screen (mockup #5) — the final step of the Add Place flow.
 * Reached from either "Use current location" (latitude/longitude only) or
 * the Select Location map (latitude/longitude/name/address). Lets the user
 * confirm/edit the name and address, then persists the place (issue #7).
 */
export function PlaceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    latitude?: string;
    longitude?: string;
    name?: string;
    address?: string;
  }>();

  const [name, setName] = useState(params.name ?? "");
  const [address, setAddress] = useState(params.address ?? "");
  const [saving, setSaving] = useState(false);

  const addPlace = usePlacesStore((state) => state.addPlace);
  const addPlaceForReminder = useReminderFlowStore((state) => state.addPlaceForReminder);
  const completeAddPlaceForReminder = useReminderFlowStore(
    (state) => state.completeAddPlaceForReminder,
  );

  const handleChangeLocation = () => {
    router.push({
      pathname: "/add-place/map",
      params: {
        latitude: params.latitude ?? "",
        longitude: params.longitude ?? "",
        name,
        address,
      },
    });
  };

  const handleSave = async () => {
    const latitude = parseFloat(params.latitude ?? "");
    const longitude = parseFloat(params.longitude ?? "");

    if (!name.trim()) {
      Alert.alert("Name required", "Please give this place a name before saving.");
      return;
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      Alert.alert("Missing location", "No location was selected for this place.");
      return;
    }

    setSaving(true);
    try {
      const id = generateId();
      await addPlace({
        id,
        name: name.trim(),
        address: address.trim() || undefined,
        latitude,
        longitude,
        icon: DEFAULT_PLACE_ICON,
        color: DEFAULT_PLACE_COLOR,
      });
      Alert.alert("Place saved", `${name.trim()} has been added to your places.`, [
        {
          text: "OK",
          onPress: () => {
            if (addPlaceForReminder) {
              // Hand the new place back to the reminder flow's place picker in
              // the Add tab (issues #58, #103); its focus effect advances to details.
              completeAddPlaceForReminder(id);
              router.dismissAll();
            } else {
              router.dismissAll();
            }
          },
        },
      ]);
    } catch {
      Alert.alert("Couldn't save place", "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Place Details" onBack={() => router.back()} />
      <PlaceDetailsForm
        icon={DEFAULT_PLACE_ICON}
        color={DEFAULT_PLACE_COLOR}
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

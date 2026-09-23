import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemIcon } from "@/components/ItemIcon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { usePlacesStore } from "@/store/placesStore";
import { colors } from "@/theme/colors";
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
  const { colorScheme } = useColorScheme();
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
  const textColor = colorScheme === "dark" ? colors.white : colors.brand;

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
      await addPlace({
        id: generateId(),
        name: name.trim(),
        address: address.trim() || undefined,
        latitude,
        longitude,
        icon: DEFAULT_PLACE_ICON,
        color: DEFAULT_PLACE_COLOR,
      });
      Alert.alert("Place saved", `${name.trim()} has been added to your places.`, [
        { text: "OK", onPress: () => router.dismissAll() },
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
      <ScrollView contentContainerClassName="px-6 pt-6 pb-8" keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <ItemIcon icon={DEFAULT_PLACE_ICON} color={DEFAULT_PLACE_COLOR} size={96} />
        </View>

        <Text className="mb-2 text-sm font-medium text-muted dark:text-mutedDark">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Place name"
          placeholderTextColor={colorScheme === "dark" ? colors.mutedDark : colors.muted}
          className="mb-5 rounded-xl bg-white px-4 py-3 text-base text-brand dark:bg-surfaceDark dark:text-white"
          style={{ color: textColor }}
        />

        <Text className="mb-2 text-sm font-medium text-muted dark:text-mutedDark">Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Address"
          placeholderTextColor={colorScheme === "dark" ? colors.mutedDark : colors.muted}
          className="mb-5 rounded-xl bg-white px-4 py-3 text-base text-brand dark:bg-surfaceDark dark:text-white"
          style={{ color: textColor }}
          multiline
        />

        <Pressable
          onPress={handleChangeLocation}
          className="mb-8 flex-row items-center rounded-xl bg-white px-4 py-4 dark:bg-surfaceDark"
        >
          <Ionicons name="map-outline" size={20} color={textColor} />
          <Text className="ml-3 flex-1 text-base font-medium text-brand dark:text-white">
            Change Location
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colorScheme === "dark" ? colors.mutedDark : colors.muted}
          />
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="items-center rounded-xl bg-brand py-4 dark:bg-brand-light"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          <Text className="text-base font-semibold text-white">
            {saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

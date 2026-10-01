import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ItemIcon } from "@/components/ItemIcon";
import { colors } from "@/theme/colors";
import type { PlaceColor, PlaceIconName } from "@/types/place";

type PlaceDetailsFormProps = {
  icon: PlaceIconName;
  color: PlaceColor;
  name: string;
  onNameChange: (name: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
  onChangeLocation: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
};

/**
 * Name/address inputs + "Change Location" row + Save button shared by
 * `PlaceDetailsScreen` (Add Place) and `EditPlaceScreen` (issue #87) — the
 * two differ only in what happens around this form (create vs. update,
 * where "Change Location" pushes to, what Save does on success).
 */
export function PlaceDetailsForm({
  icon,
  color,
  name,
  onNameChange,
  address,
  onAddressChange,
  onChangeLocation,
  onSave,
  saving = false,
  saveLabel = "Save",
}: PlaceDetailsFormProps) {
  const { colorScheme } = useColorScheme();
  const textColor = colorScheme === "dark" ? colors.white : colors.brand;

  return (
    <ScrollView contentContainerClassName="px-6 pt-6 pb-8" keyboardShouldPersistTaps="handled">
      <View className="mb-8 items-center">
        <ItemIcon icon={icon} color={color} size={96} />
      </View>

      <Text className="mb-2 text-sm font-medium text-muted dark:text-mutedDark">Name</Text>
      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Place name"
        placeholderTextColor={colorScheme === "dark" ? colors.mutedDark : colors.muted}
        className="mb-5 rounded-xl bg-white px-4 py-3 text-base text-brand dark:bg-surfaceDark dark:text-white"
        style={{ color: textColor }}
      />

      <Text className="mb-2 text-sm font-medium text-muted dark:text-mutedDark">Address</Text>
      <TextInput
        value={address}
        onChangeText={onAddressChange}
        placeholder="Address"
        placeholderTextColor={colorScheme === "dark" ? colors.mutedDark : colors.muted}
        className="mb-5 rounded-xl bg-white px-4 py-3 text-base text-brand dark:bg-surfaceDark dark:text-white"
        style={{ color: textColor }}
        multiline
      />

      <Pressable
        onPress={onChangeLocation}
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
        onPress={onSave}
        disabled={saving}
        className="items-center rounded-xl bg-brand py-4 dark:bg-brand-light"
        style={{ opacity: saving ? 0.7 : 1 }}
      >
        <Text className="text-base font-semibold text-white">
          {saving ? "Saving…" : saveLabel}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

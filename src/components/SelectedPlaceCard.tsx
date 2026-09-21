import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

type SelectedPlaceCardProps = {
  name: string;
  address: string;
  /** True while the address is being reverse-geocoded for the current pin position. */
  loading?: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
};

/**
 * Bottom card on the Select Location screen (mockup #4): selected place
 * name (editable via the pencil icon) + resolved address, and the primary
 * "Save Place" action that hands the selection off to Place Details.
 */
export function SelectedPlaceCard({
  name,
  address,
  loading = false,
  onNameChange,
  onSave,
}: SelectedPlaceCardProps) {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [isEditingName, setIsEditingName] = useState(false);
  const iconColor = colorScheme === "dark" ? colors.mutedDark : colors.muted;

  return (
    <View
      className="rounded-t-2xl bg-white px-6 pt-3 dark:bg-surfaceDark"
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="mb-3 h-1 w-10 self-center rounded-full bg-track dark:bg-brand" />

      <View className="mb-1 flex-row items-center gap-2">
        {isEditingName ? (
          <TextInput
            value={name}
            onChangeText={onNameChange}
            onSubmitEditing={() => setIsEditingName(false)}
            onBlur={() => setIsEditingName(false)}
            autoFocus
            className="flex-1 text-lg font-bold text-brand dark:text-white"
            style={{ color: colorScheme === "dark" ? colors.white : colors.brand }}
          />
        ) : (
          <Text className="flex-1 text-lg font-bold text-brand dark:text-white" numberOfLines={1}>
            {name || "Selected location"}
          </Text>
        )}
        <Pressable onPress={() => setIsEditingName(true)} hitSlop={12}>
          <Ionicons name="pencil" size={18} color={iconColor} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator className="mb-4 self-start" color={iconColor} />
      ) : (
        <Text className="mb-4 text-sm text-muted dark:text-mutedDark" numberOfLines={2}>
          {address || "Move the map to select a location"}
        </Text>
      )}

      <Pressable onPress={onSave} className="items-center rounded-xl bg-brand py-4 dark:bg-brand-light">
        <Text className="text-base font-semibold text-white">Save Place</Text>
      </Pressable>
    </View>
  );
}

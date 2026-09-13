import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { TextInput, View } from "react-native";

import { colors } from "@/theme/colors";

type LocationSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  autoFocus?: boolean;
};

/**
 * Rounded search pill on the Select Location screen (mockup #4): "Search
 * for a place or address" with a leading magnifier icon. Submitting (return
 * key) forward-geocodes the query via the parent screen's `onSubmit`.
 */
export function LocationSearchBar({
  value,
  onChangeText,
  onSubmit,
  autoFocus = false,
}: LocationSearchBarProps) {
  const { colorScheme } = useColorScheme();
  const mutedColor = colorScheme === "dark" ? colors.mutedDark : colors.muted;
  const textColor = colorScheme === "dark" ? colors.white : colors.navy;

  return (
    <View className="mx-6 mt-4 flex-row items-center gap-2 rounded-xl bg-white px-4 py-3 dark:bg-surfaceDark">
      <Ionicons name="search" size={18} color={mutedColor} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
        placeholder="Search for a place or address"
        placeholderTextColor={mutedColor}
        style={{ color: textColor }}
        className="flex-1 text-base"
      />
    </View>
  );
}

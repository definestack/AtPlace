import { Pressable, Text, View } from "react-native";

import { GEOFENCE_RADIUS_PRESETS_M } from "@/db/placesRepository";
import { useSettingsStore } from "@/store/settingsStore";
import { formatRadius } from "@/utils/distance";

type RadiusPickerProps = {
  value: number;
  onChange: (meters: number) => void;
};

/**
 * Geofence trigger radius picker (issue #126) for the Add/Edit Place forms —
 * a row of preset chips styled like `SegmentedTabs`' pill toggle. Labels
 * follow the Units setting (km → meters, mi → feet) but the stored value is
 * always meters, matching `Place.radius` and the geofencing layer.
 *
 * If `value` isn't one of the presets (e.g. a backup restored from before
 * this picker existed, or any other legacy value), an extra "Custom" chip is
 * shown selected so saving without touching the control doesn't silently
 * change the place's radius.
 */
export function RadiusPicker({ value, onChange }: RadiusPickerProps) {
  const units = useSettingsStore((state) => state.units);
  const isCustom = !GEOFENCE_RADIUS_PRESETS_M.includes(value as (typeof GEOFENCE_RADIUS_PRESETS_M)[number]);

  const chips: { meters: number; label: string }[] = GEOFENCE_RADIUS_PRESETS_M.map((meters) => ({
    meters,
    label: formatRadius(meters, units),
  }));
  if (isCustom) {
    chips.push({ meters: value, label: `Custom · ${formatRadius(value, units)}` });
  }

  return (
    <View>
      <View className="flex-row flex-wrap rounded-xl bg-track p-1 dark:bg-surfaceDark">
        {chips.map((chip) => {
          const selected = chip.meters === value;
          return (
            <Pressable
              key={chip.meters}
              onPress={() => onChange(chip.meters)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`m-1 items-center rounded-lg px-3 py-3 ${
                selected ? "bg-white dark:bg-brand-light" : ""
              }`}
            >
              <Text
                className={
                  selected
                    ? "font-semibold text-brand dark:text-white"
                    : "text-muted dark:text-mutedDark"
                }
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-2 text-xs text-muted dark:text-mutedDark">
        Reminders fire when you&apos;re within this distance of the place.
      </Text>
    </View>
  );
}

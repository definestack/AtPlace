import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useRef, useState } from "react";
import { Modal, Pressable, Text, useWindowDimensions, View } from "react-native";

import { colors } from "@/theme/colors";

export type HeaderMenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Styles the row coral (e.g. destructive actions like "Clear all"). */
  destructive?: boolean;
  onPress: () => void;
};

type HeaderMenuProps = {
  items: HeaderMenuItem[];
  accessibilityLabel: string;
};

type Anchor = { top: number; right: number };

/**
 * Overflow menu for screen headers (issue #75): a rounded dot-grid trigger
 * that opens a floating card anchored below it. Used to replace inline text
 * action rows (e.g. Notifications' "Mark all as read" / "Clear") with a
 * tidier top-right menu.
 */
export function HeaderMenu({ items, accessibilityLabel }: HeaderMenuProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width: windowWidth } = useWindowDimensions();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height + 8, right: windowWidth - (x + width) });
    });
  };

  const close = () => setAnchor(null);

  const handleSelect = (item: HeaderMenuItem) => {
    close();
    item.onPress();
  };

  const dotColor = isDark ? colors.white : colors.brand;

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={open}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: anchor !== null }}
          className="h-11 w-11 items-center justify-center rounded-full bg-track dark:bg-surfaceDark"
        >
          <View className="flex-row flex-wrap" style={{ width: 14, height: 14, gap: 4 }}>
            {[0, 1, 2, 3].map((dot) => (
              <View
                key={dot}
                style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: dotColor }}
              />
            ))}
          </View>
        </Pressable>
      </View>

      <Modal visible={anchor !== null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable className="flex-1" onPress={close} accessibilityLabel="Close menu">
          {anchor ? (
            <View
              className="absolute min-w-[240px] rounded-2xl bg-white dark:bg-surfaceDark"
              style={{
                top: anchor.top,
                right: anchor.right,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {items.map((item, index) => (
                <Pressable
                  key={item.key}
                  onPress={() => handleSelect(item)}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                  className={`flex-row items-center gap-4 px-5 py-4 ${
                    index > 0 ? "border-t border-track dark:border-white/10" : ""
                  }`}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.destructive ? colors.coral : isDark ? colors.white : colors.muted}
                  />
                  <Text
                    className={`text-base font-medium ${
                      item.destructive ? "" : "text-brand dark:text-white"
                    }`}
                    style={item.destructive ? { color: colors.coral } : undefined}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

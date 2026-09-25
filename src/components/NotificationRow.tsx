import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { ItemIcon } from "@/components/ItemIcon";
import { colors } from "@/theme/colors";
import type { AppNotification } from "@/types/notification";
import { formatRelativeTime } from "@/utils/relativeTime";

type NotificationRowProps = {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
  onToggleRead: (notification: AppNotification) => void;
  onDelete: (notification: AppNotification) => void;
};

const TRIGGER_LABEL: Record<AppNotification["trigger"], string> = {
  arrive: "Arrived",
  leave: "Left",
};

/**
 * A single row in the Notifications inbox (issue #40). Swiping reveals
 * "Mark read/unread" and "Delete" actions, keeping the row itself lightweight
 * and scannable per the ticket's UX guidance. Location is rendered as its
 * own prominent line (with a pin icon) since it's AtPlace's core
 * differentiator, ahead of the trigger/timestamp detail line.
 */
export function NotificationRow({
  notification,
  onPress,
  onToggleRead,
  onDelete,
}: NotificationRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handleToggleRead = () => {
    swipeableRef.current?.close();
    onToggleRead(notification);
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete(notification);
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <View className="flex-row">
          <Pressable
            onPress={handleToggleRead}
            accessibilityRole="button"
            accessibilityLabel={
              notification.read ? "Mark notification as unread" : "Mark notification as read"
            }
            className="items-center justify-center bg-track px-5 dark:bg-surfaceDark"
          >
            <Ionicons
              name={notification.read ? "mail-unread-outline" : "mail-open-outline"}
              size={20}
              color={isDark ? colors.white : colors.brand}
            />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete notification: ${notification.reminderTitle}`}
            className="items-center justify-center px-5"
            style={{ backgroundColor: colors.coral }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.white} />
          </Pressable>
        </View>
      )}
    >
      <Pressable
        onPress={() => onPress(notification)}
        className={`flex-row items-start gap-3 px-6 py-3 ${
          notification.read ? "" : "bg-track/60 dark:bg-surfaceDark/60"
        }`}
      >
        <View className="mt-1">
          {notification.read ? null : (
            <View
              className="absolute -left-1.5 top-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: colors.brandLight }}
            />
          )}
          <ItemIcon icon={notification.placeIcon} color={notification.placeColor} />
        </View>
        <View className="flex-1">
          <Text
            className={`text-base text-brand dark:text-white ${
              notification.read ? "font-medium" : "font-bold"
            }`}
          >
            {notification.reminderTitle}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons
              name="location"
              size={14}
              color={isDark ? colors.brandLight : colors.brand}
            />
            <Text className="text-sm font-medium text-brand dark:text-white">
              {notification.placeName}
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-muted dark:text-mutedDark">
            {TRIGGER_LABEL[notification.trigger]} • {formatRelativeTime(notification.createdAt)}
          </Text>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

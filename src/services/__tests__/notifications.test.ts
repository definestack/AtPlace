import * as Notifications from "expo-notifications";

import {
  presentReminderNotification,
  presentTestNotification,
  REMINDER_CHANNEL_SILENT,
  REMINDER_CHANNEL_SOUND_VIBRATION,
  REMINDER_CHANNEL_VIBRATION_ONLY,
  TEST_NOTIFICATION_DELAYS,
} from "@/services/notifications";

// The service calls `setNotificationHandler` at import time, so the factory must provide it.
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
  AndroidImportance: {},
}));

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;

/** Returns the request object passed to the most recent `scheduleNotificationAsync` call. */
function lastScheduledRequest(): { content: Record<string, unknown>; trigger: unknown } {
  return scheduleMock.mock.calls[scheduleMock.mock.calls.length - 1][0];
}

beforeEach(() => {
  scheduleMock.mockReset();
  scheduleMock.mockResolvedValue("notification-id");
});

describe("presentTestNotification", () => {
  it("delivers immediately when no delay is given", async () => {
    await presentTestNotification(true, true);

    const { content, trigger } = lastScheduledRequest();
    expect(trigger).toEqual({ channelId: REMINDER_CHANNEL_SOUND_VIBRATION });
    expect(content).toMatchObject({ sound: "default", title: "Test Notification" });
    expect(content.vibrate).toBeDefined();
  });

  it("treats an explicit 0 second delay as immediate", async () => {
    await presentTestNotification(true, true, 0);

    expect(lastScheduledRequest().trigger).toEqual({ channelId: REMINDER_CHANNEL_SOUND_VIBRATION });
  });

  it.each([5, 10])("uses a time-interval trigger for a %i second delay", async (seconds) => {
    await presentTestNotification(true, true, seconds);

    expect(lastScheduledRequest().trigger).toEqual({
      type: "timeInterval",
      seconds,
      channelId: REMINDER_CHANNEL_SOUND_VIBRATION,
    });
  });

  it("follows the vibration-only settings for both content and channel", async () => {
    await presentTestNotification(false, true, 5);

    const { content, trigger } = lastScheduledRequest();
    expect(trigger).toEqual({ type: "timeInterval", seconds: 5, channelId: REMINDER_CHANNEL_VIBRATION_ONLY });
    expect(content).toMatchObject({ sound: false, data: { sound: false, vibration: true } });
    expect(content.vibrate).toBeDefined();
  });

  it("omits vibration pattern and sound when both are off", async () => {
    await presentTestNotification(false, false);

    const { content, trigger } = lastScheduledRequest();
    expect(trigger).toEqual({ channelId: REMINDER_CHANNEL_SILENT });
    expect(content).toMatchObject({ sound: false });
    expect(content.vibrate).toBeUndefined();
  });
});

describe("TEST_NOTIFICATION_DELAYS", () => {
  it("offers immediate, 5 second and 10 second choices", () => {
    expect(TEST_NOTIFICATION_DELAYS.map(({ seconds }) => seconds)).toEqual([0, 5, 10]);
  });
});

describe("presentReminderNotification", () => {
  it("keeps immediate reminder triggers unchanged", async () => {
    await presentReminderNotification("Office", "Take laptop", "arrive", true, false);

    expect(lastScheduledRequest().trigger).toEqual({ channelId: "atplace-reminders-sound" });
  });

  it("keeps delayed reminder triggers unchanged", async () => {
    await presentReminderNotification("Office", "Take laptop", "leave", true, true, 30);

    expect(lastScheduledRequest().trigger).toEqual({
      type: "timeInterval",
      seconds: 30,
      channelId: REMINDER_CHANNEL_SOUND_VIBRATION,
    });
  });
});

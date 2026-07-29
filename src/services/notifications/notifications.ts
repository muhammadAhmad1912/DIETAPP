import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationSettings } from '@/types/models';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/constants/config';
import { cacheGet, cacheSet } from '@/services/storage/cache';
import { StorageKeys } from '@/services/storage/keys';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const cached = await cacheGet<NotificationSettings>(StorageKeys.NOTIFICATIONS);
  return cached ?? DEFAULT_NOTIFICATION_SETTINGS;
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  await cacheSet(StorageKeys.NOTIFICATIONS, settings);
  await syncScheduledNotifications(settings);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Diet Tracker',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return status === 'granted';
}

export async function syncScheduledNotifications(
  settings?: NotificationSettings,
): Promise<void> {
  const config = settings ?? (await getNotificationSettings());
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!config.enabled) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  if (config.mealReminders) {
    await scheduleDaily(
      'meal-breakfast',
      'Breakfast reminder',
      'Log your breakfast to stay on track.',
      config.mealTimes.breakfast,
    );
    await scheduleDaily(
      'meal-lunch',
      'Lunch reminder',
      'Time to log lunch.',
      config.mealTimes.lunch,
    );
    await scheduleDaily(
      'meal-dinner',
      'Dinner reminder',
      'Remember to log dinner.',
      config.mealTimes.dinner,
    );
  }

  if (config.waterReminders) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hydration check',
        body: 'Have a glass of water.',
        data: { type: 'water' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, config.waterIntervalHours) * 60 * 60,
        repeats: true,
      },
    });
  }

  if (config.weighInReminders) {
    await scheduleDaily(
      'weigh-in',
      'Morning weigh-in',
      'Log your weight to keep your progress on track.',
      '08:00',
    );
  }
}

async function scheduleDaily(
  _id: string,
  title: string,
  body: string,
  hhmm: string,
  weekday?: number,
): Promise<void> {
  const [hour, minute] = hhmm.split(':').map(Number);

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: weekday
      ? {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
  });
}

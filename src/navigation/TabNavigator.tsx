import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { DailyHistoryScreen } from '@/screens/history/DailyHistoryScreen';
import { ProgressScreen } from '@/screens/progress/ProgressScreen';
import { WeightTrackerScreen } from '@/screens/weight/WeightTrackerScreen';
import { InventoryScreen } from '@/screens/inventory/InventoryScreen';
import { MorePlaceholderScreen } from '@/screens/settings/MorePlaceholderScreen';
import { FloatingTabBar } from '@/navigation/FloatingTabBar';
import type { MainTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="History" component={DailyHistoryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen
        name="Weight"
        component={WeightTrackerScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen name="More" component={MorePlaceholderScreen} />
    </Tab.Navigator>
  );
}

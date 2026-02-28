import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { backgroundColor: '#0B1120', borderTopColor: 'rgba(255,255,255,0.1)' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      {/* Hidden Screens - using both href and display:none to be completely safe */}
      <Tabs.Screen name="create-request" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="payment" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="driver-active-rides" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="driver-request" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="driver-earnings" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="rider-home" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="driver-home" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  );
}
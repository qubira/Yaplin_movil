import { Tabs, Redirect } from 'expo-router';
import { View, ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../constants/theme';
import { useAuth } from '../../store/AuthStore';

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: ColorValue;
  accentColor: string;
}

function TabIcon({ name, focused, color, accentColor }: TabIconProps) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      width: 44, height: 34, borderRadius: 17,
      backgroundColor: focused ? `${accentColor}22` : 'transparent',
    }}>
      <Ionicons name={name} size={22} color={color as string} />
    </View>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user, hydrated } = useAuth();

  if (hydrated && !user) return <Redirect href="/(auth)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.BACKGROUND_CARD,
          borderTopColor: c.BORDER,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: c.ACCENT_PURPLE,
        tabBarInactiveTintColor: c.TEXT_SECONDARY,
        tabBarShowLabel: false,
        tabBarItemStyle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} accentColor={c.ACCENT_PURPLE} />
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'business' : 'business-outline'} focused={focused} color={color} accentColor={c.ACCENT_PURPLE} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} color={color} accentColor={c.ACCENT_PURPLE} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} accentColor={c.ACCENT_PURPLE} />
          ),
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

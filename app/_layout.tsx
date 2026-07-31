import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../constants/theme';
import { LocaleProvider } from '../store/LocaleStore';
import { AuthProvider } from '../store/AuthStore';
import { PaymentsProvider } from '../store/PaymentsStore';
import { StoresProvider } from '../store/StoresStore';
import { BottomSheetProvider } from '../store/BottomSheetStore';
import { useNotificationCapture } from '../hooks/useNotificationCapture';

SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { c } = useTheme();
  useNotificationCapture();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.BACKGROUND_DARK },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <StoresProvider>
              <PaymentsProvider>
                <BottomSheetProvider>
                  <AppStack />
                </BottomSheetProvider>
              </PaymentsProvider>
            </StoresProvider>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

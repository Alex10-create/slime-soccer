import 'react-native-gesture-handler'; // Must be first import
import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';

import HomeScreen       from './src/screens/HomeScreen';
import ModeSelectScreen from './src/screens/ModeSelectScreen';
import GameScreen       from './src/screens/GameScreen';
import OnlineLobbyScreen from './src/screens/OnlineLobbyScreen';
import type { PlayerMode, GameMode } from './src/types/game';

// Keep the splash screen while app mounts
SplashScreen.preventAutoHideAsync();

export type RootStackParamList = {
  Home:         undefined;
  ModeSelect:   { playerMode: PlayerMode };
  Game:         { playerMode: PlayerMode; gameMode: GameMode; roomId?: string };
  OnlineLobby:  undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    SplashScreen.hideAsync();
  }, []);

  // Load CanvasKit WASM for web (served from CDN since Metro can't serve .wasm)
  useEffect(() => {
    if (Platform.OS === 'web') {
      import('@shopify/react-native-skia/lib/module/web')
        .then(({ LoadSkiaWeb }) =>
          LoadSkiaWeb({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
          })
        )
        .then(() => setSkiaReady(true))
        .catch((e) => console.warn('Skia web load failed:', e));
    }
  }, []);

  if (!skiaReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Loading game engine...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown:         false,
            animation:           'fade',
            contentStyle:        { backgroundColor: '#111827' },
            statusBarHidden:     true,
          }}
        >
          <Stack.Screen name="Home"         component={HomeScreen} />
          <Stack.Screen name="ModeSelect"   component={ModeSelectScreen} />
          <Stack.Screen name="Game"         component={GameScreen} />
          <Stack.Screen name="OnlineLobby"  component={OnlineLobbyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

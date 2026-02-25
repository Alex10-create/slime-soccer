import 'react-native-gesture-handler'; // Must be first import
import React, { useEffect } from 'react';
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
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    SplashScreen.hideAsync();
  }, []);

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

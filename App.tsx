import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import PlanContainerScreen from './screens/PlanContainerScreen';
import WorkoutLoggerScreen from './screens/WorkoutLoggerScreen';
import WorkoutHistoryDetailScreen from './screens/WorkoutHistoryDetailScreen';
import { supabase } from './services/supabase';

import type { WorkoutDay, Exercise } from './types';

export type WorkoutDayWithExercises = WorkoutDay & {
  exercises: Exercise[];
};

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Plan: undefined;
  WorkoutLogger: {
    day: WorkoutDayWithExercises;
  };
  WorkoutHistoryDetail: {
    dayId: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    async function checkSupabaseConnection() {
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.warn('Supabase connection check failed:', error.message);
      }
    }

    checkSupabaseConnection();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Plan"
          component={PlanContainerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WorkoutLogger"
          component={WorkoutLoggerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WorkoutHistoryDetail"
          component={WorkoutHistoryDetailScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

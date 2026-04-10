import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import PlanContainerScreen from './screens/PlanContainerScreen';
import WorkoutLoggerScreen from './screens/WorkoutLoggerScreen';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
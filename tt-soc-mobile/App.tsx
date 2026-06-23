import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ✅ Imports de tous les écrans
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AlertDetailsScreen from './src/screens/AlertDetailsScreen';
import LogAnalysisScreen from './src/screens/LogAnalysisScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ThreatMapScreen from './src/screens/ThreatMapScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login" 
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen as React.ComponentType<any>} />
        <Stack.Screen name="Dashboard" component={DashboardScreen as React.ComponentType<any>} />
        <Stack.Screen name="AlertDetails" component={AlertDetailsScreen as React.ComponentType<any>} />
        <Stack.Screen name="LogAnalysis" component={LogAnalysisScreen as React.ComponentType<any>} />
        <Stack.Screen name="Chatbot" component={ChatbotScreen as React.ComponentType<any>} />
        <Stack.Screen name="Reports" component={ReportsScreen as React.ComponentType<any>} />
        <Stack.Screen name="ThreatMap" component={ThreatMapScreen as React.ComponentType<any>} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
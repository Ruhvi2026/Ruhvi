import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSupabaseToken } from './src/lib/supabase';

import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a stored Custom JWT on startup
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('ruhvi_mobile_jwt');
      const userId = await AsyncStorage.getItem('ruhvi_user_id');
      if (token) {
        setSupabaseToken(token, userId);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return null; // Loading screen could go here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={isAuthenticated ? "ChatList" : "Login"}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#075E54', // WhatsApp Green
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          options={{ headerShown: false }}
        >
          {(props) => <LoginScreen {...props} onLoginSuccess={() => setIsAuthenticated(true)} />}
        </Stack.Screen>
        
        <Stack.Screen 
          name="ChatList" 
          component={ChatListScreen} 
          options={{ 
            title: 'RuhChat',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Log Out', 'Are you sure you want to log out?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Log Out',
                      style: 'destructive',
                      onPress: async () => {
                        await AsyncStorage.removeItem('ruhvi_mobile_jwt');
                        await AsyncStorage.removeItem('ruhvi_user_id');
                        setSupabaseToken(null);
                        setIsAuthenticated(false);
                      },
                    },
                  ]);
                }}
                style={{ padding: 4 }}
              >
                <MaterialIcons name="logout" size={22} color="#fff" />
              </TouchableOpacity>
            )
          }} 
        />
        <Stack.Screen 
          name="ChatRoom" 
          component={ChatRoomScreen} 
          options={({ route }: any) => ({ title: route.params?.title || 'Chat' })} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

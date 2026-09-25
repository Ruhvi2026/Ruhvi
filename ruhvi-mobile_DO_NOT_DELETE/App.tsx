import React, { useEffect, useState, useRef } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSupabaseToken } from './src/lib/supabase';
import { registerForPushNotificationsAsync } from './src/lib/notifications';

import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';

export const navigationRef = createNavigationContainerRef<any>();

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
        registerForPushNotificationsAsync();
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    // 1. Handle notification tap when app is running in background or foreground
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      const conversationId = data?.conversationId;
      if (conversationId && navigationRef.isReady()) {
        navigationRef.navigate('ChatRoom', {
          id: conversationId,
          title: response.notification.request.content.title || 'Chat',
        });
      }
    });

    // 2. Handle cold launch when app was closed/killed and opened by clicking notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data;
        const conversationId = data?.conversationId;
        if (conversationId && navigationRef.isReady()) {
          navigationRef.navigate('ChatRoom', {
            id: conversationId,
            title: response.notification.request.content.title || 'Chat',
          });
        }
      }
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    registerForPushNotificationsAsync();
  };

  if (isAuthenticated === null) {
    return null; // Loading screen
  }

  return (
    <NavigationContainer ref={navigationRef}>
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
          {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
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

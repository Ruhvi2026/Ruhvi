import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Alert, View, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, setSupabaseToken, getCurrentUserId } from './src/lib/supabase';
import { registerForPushNotificationsAsync, triggerLocalNotification } from './src/lib/notifications';

export const navigationRef = createNavigationContainerRef();

import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import CoFounderChatScreen from './src/screens/CoFounderChatScreen';
import InventoryScanScreen from './src/screens/InventoryScanScreen';
import MailboxScreen from './src/screens/MailboxScreen';

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

    // Listen for notification clicks (WhatsApp-style: opens the exact chat room directly)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data;
        const convId = data?.conversationId || data?.conversation_id;
        const title = response?.notification?.request?.content?.title || 'Chat';
        if (convId && navigationRef.isReady()) {
          (navigationRef as any).navigate('ChatRoom', { id: convId, title });
        }
      } catch (e) {
        console.warn('[App] Notification tap navigation note:', e);
      }
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    let notifChannel: any = null;

    const setupRealtime = async () => {
      const myId = (await AsyncStorage.getItem('ruhvi_user_id')) || getCurrentUserId();
      if (!myId) return;

      notifChannel = supabase
        .channel(`user_alerts_${myId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${myId}`,
          },
          (payload: any) => {
            const currentRoute: any = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
            const isLookingAtSameRoom =
              currentRoute?.name === 'ChatRoom' &&
              currentRoute?.params?.id === payload.new?.reference_id;

            if (!isLookingAtSameRoom && payload?.new) {
              triggerLocalNotification(
                payload.new.title || 'New Message',
                payload.new.message || 'You received a new message',
                {
                  conversationId: payload.new.reference_id,
                  type: 'chat',
                }
              );
            }
          }
        )
        .subscribe();
    };

    if (isAuthenticated) {
      setupRealtime();
    }

    return () => {
      if (notifChannel) {
        supabase.removeChannel(notifChannel);
      }
    };
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    registerForPushNotificationsAsync();
  };

  if (isAuthenticated === null) {
    return null; // Loading screen could go here
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
          options={({ navigation }: any) => ({ 
            title: 'RuhChat',
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Mailbox')}
                  style={{ padding: 4 }}
                  accessibilityLabel="RuhChat Mailbox"
                >
                  <MaterialIcons name="mail" size={22} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => Linking.openURL('https://admin.ruhvi.in/admin/task-manager')}
                  style={{ padding: 4 }}
                  accessibilityLabel="Open Task Manager"
                >
                  <MaterialIcons name="assignment" size={22} color="#fff" />
                </TouchableOpacity>

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
                          await AsyncStorage.removeItem('ruhvi_user_role');
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
              </View>
            )
          })} 
        />
        <Stack.Screen 
          name="InventoryScan" 
          component={InventoryScanScreen} 
          options={{ 
            title: 'Scan & Add Stock',
            headerStyle: { backgroundColor: '#075E54' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        <Stack.Screen 
          name="Mailbox" 
          component={MailboxScreen} 
          options={{ 
            title: 'RuhChat Mailbox',
            headerStyle: { backgroundColor: '#075E54' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        <Stack.Screen 
          name="ChatRoom" 
          component={ChatRoomScreen} 
          options={({ route }: any) => ({ title: route.params?.title || 'Chat' })} 
        />
        <Stack.Screen 
          name="CoFounderChat" 
          component={CoFounderChatScreen} 
          options={({ route }: any) => ({
            title: route.params?.name || (route.params?.isCoFounder ? 'Ruhvi AI Co-Founder' : 'AI Worker'),
          })} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

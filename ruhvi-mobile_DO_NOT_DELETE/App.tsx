import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Alert, View, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSupabaseToken } from './src/lib/supabase';
import { registerForPushNotificationsAsync } from './src/lib/notifications';

import LoginScreen from './src/screens/LoginScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import CoFounderChatScreen from './src/screens/CoFounderChatScreen';
import InventoryScanScreen from './src/screens/InventoryScanScreen';

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

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    registerForPushNotificationsAsync();
  };

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
                  onPress={() => navigation.navigate('InventoryScan')}
                  style={{ padding: 4 }}
                  accessibilityLabel="Scan & Add Stock"
                >
                  <MaterialIcons name="qr-code-scanner" size={22} color="#fff" />
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

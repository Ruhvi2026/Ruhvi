import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, setSupabaseToken } from '../lib/supabase';

// Since you are testing on your physical phone with Expo Go,
// we can use the live production server directly! No need to run the local Next.js server.
const FIREBASE_API_KEY = 'AIzaSyBm3ulxup4YZ1uVETMQnwrI7_SMlrWspHw';

export default function LoginScreen({ onLoginSuccess }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your staff email and password');
      return;
    }
    
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      let firebaseUid: string | null = null;
      let userEmail: string = normalizedEmail;

      // Step 1: Direct authentication with Google Firebase Auth REST API (bypasses any Vercel deployment block)
      try {
        const fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: normalizedEmail,
              password: password,
              returnSecureToken: true,
            }),
          }
        );

        const fbData = await fbRes.json();

        if (fbRes.ok && fbData.localId) {
          firebaseUid = fbData.localId;
          userEmail = fbData.email || normalizedEmail;
        } else {
          // Check for specific Firebase error code
          const rawErr = fbData?.error?.message;
          if (rawErr === 'INVALID_LOGIN_CREDENTIALS' || rawErr === 'INVALID_PASSWORD') {
            throw new Error('Invalid email or password. Please verify your credentials.');
          } else if (rawErr === 'EMAIL_NOT_FOUND') {
            throw new Error('Staff account not found for this email address.');
          } else if (rawErr === 'USER_DISABLED') {
            throw new Error('This staff account has been deactivated. Please contact management.');
          } else if (rawErr) {
            throw new Error(`Firebase Auth error: ${rawErr}`);
          }
        }
      } catch (fbErr: any) {
        // If Firebase threw a known auth error, rethrow it
        if (fbErr.message && !fbErr.message.includes('fetch')) {
          throw fbErr;
        }
      }

      // Step 2: Fallback to Supabase Auth directly if Firebase UID wasn't established
      if (!firebaseUid) {
        const { data: supaAuth, error: supaErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (supaAuth?.user) {
          firebaseUid = supaAuth.user.id;
        } else {
          const errMsg = supaErr?.message || 'Invalid email or password.';
          throw new Error(errMsg);
        }
      }

      // Step 3: Call Supabase RPC to mint and sign the Custom JWT
      const { data: authResult, error: rpcError } = await supabase.rpc('authenticate_staff_mobile', {
        p_firebase_uid: firebaseUid,
        p_email: userEmail,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Staff authentication service error');
      }

      if (authResult?.error) {
        throw new Error(authResult.error);
      }

      if (!authResult?.supabaseToken || !authResult?.supabaseUserId) {
        throw new Error('Authentication succeeded but session token could not be generated.');
      }

      // Step 4: Inject the Custom JWT into the Supabase Client
      setSupabaseToken(authResult.supabaseToken);
      await AsyncStorage.setItem('ruhvi_mobile_jwt', authResult.supabaseToken);
      await AsyncStorage.setItem('ruhvi_user_id', authResult.supabaseUserId);
      if (authResult.role) {
        await AsyncStorage.setItem('ruhvi_user_role', authResult.role);
      }
      if (authResult.department) {
        await AsyncStorage.setItem('ruhvi_user_dept', authResult.department);
      }
      
      // Update global auth state to route to ChatList
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
    } catch (err: any) {
      let displayMsg = 'Login failed. Please try again.';
      if (typeof err === 'string') {
        displayMsg = err;
      } else if (err?.message) {
        displayMsg = err.message;
      } else if (typeof err === 'object') {
        try {
          displayMsg = JSON.stringify(err);
        } catch {
          displayMsg = 'Unknown authentication error';
        }
      }

      if (Platform.OS === 'web') {
        window.alert('Login Failed: ' + displayMsg);
      } else {
        Alert.alert('Login Failed', displayMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoHeader}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logoIcon}
          resizeMode="contain"
        />
        <Text style={styles.title}>RuhChat</Text>
        <Text style={styles.subtitle}>Official Staff Messenger</Text>
      </View>
      
      <TextInput 
        style={styles.input}
        placeholder="Staff Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput 
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#075E54" />
      ) : (
        <Button title="Secure Login" color="#075E54" onPress={handleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    padding: 24,
    backgroundColor: '#F8FAF9'
  },
  logoHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 84,
    height: 84,
    borderRadius: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#075E54',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 15
  }
});

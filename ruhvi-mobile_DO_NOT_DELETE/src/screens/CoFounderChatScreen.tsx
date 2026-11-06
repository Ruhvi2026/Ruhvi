import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  ToastAndroid,
  StatusBar,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { AudioRecorder } from 'expo-audio';
import { uploadToCloudinary } from '../lib/cloudinary';
import {
  AI_WORKER_PERSONAS,
  resolveAIWorkerForUser,
  AIWorkerPersona,
} from '../lib/personas';
import { supabase, getCurrentUserId } from '../lib/supabase';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import ForwardMessageModal from '../components/ForwardMessageModal';
import FileAttachmentCard, { FileItem } from '../components/FileAttachmentCard';
import {
  startAudioRecording,
  stopAudioRecording,
  transcribeAudio,
  transcribeAudioDetailed,
  uploadVoiceNote,
} from '../lib/audioService';

const CO_FOUNDER_ENDPOINTS = [
  'https://admin.ruhvi.in/api/admin/co-founder/chat',
  'https://ruhvi.in/api/admin/co-founder/chat',
];

const AI_WORKER_ENDPOINTS = [
  'https://admin.ruhvi.in/api/internal-chat/ai-worker',
  'https://ruhvi.in/api/internal-chat/ai-worker',
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  files?: FileItem[];
  timestamp: number;
  provider?: string;
  model?: string;
  toolExecuted?: boolean;
}

export default function CoFounderChatScreen({ navigation, route }: any) {
  const headerHeight = useHeaderHeight();
  const routeParams = route?.params || {};

  // Resolve initial persona from params or default to orders
  const initialPersona: AIWorkerPersona =
    routeParams.department && AI_WORKER_PERSONAS[routeParams.department]
      ? {
        ...AI_WORKER_PERSONAS[routeParams.department],
        ...(routeParams.name ? { name: routeParams.name } : {}),
        ...(routeParams.roleTitle ? { roleTitle: routeParams.roleTitle } : {}),
        ...(routeParams.avatarEmoji ? { avatarEmoji: routeParams.avatarEmoji } : {}),
        ...(routeParams.welcomeMessage ? { welcomeMessage: routeParams.welcomeMessage } : {}),
      }
      : routeParams.isCoFounder
        ? AI_WORKER_PERSONAS.founder
        : AI_WORKER_PERSONAS.orders;

  const [activePersona, setActivePersona] = useState<AIWorkerPersona>(initialPersona);
  const workerDisplayName =
    activePersona.department === 'founder'
      ? 'Co-Founder'
      : (activePersona.name || 'AI Worker');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: initialPersona.welcomeMessage,
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Message Actions & Starred State
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(new Set());
  const [actionMenuMessage, setActionMenuMessage] = useState<ChatMessage | null>(null);
  const [isForwardModalVisible, setIsForwardModalVisible] = useState(false);
  const [forwardTargetMessage, setForwardTargetMessage] = useState<ChatMessage | null>(null);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingRef, setRecordingRef] = useState<AudioRecorder | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordTimer, setRecordTimer] = useState<any>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // Speech-to-Text (STT) Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const [dictatingRef, setDictatingRef] = useState<AudioRecorder | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  // Lifecycle Refs to prevent unmount leaks
  const recordTimerRef = useRef<any>(null);
  const activeRecordingRef = useRef<AudioRecorder | null>(null);
  const activeDictatingRef = useRef<AudioRecorder | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ uri: string; url?: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
    content?: string;
  } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

  // Unmount cleanup for active audio recording and timer
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      if (activeRecordingRef.current) {
        activeRecordingRef.current.stop().catch(() => {});
        activeRecordingRef.current = null;
      }
      if (activeDictatingRef.current) {
        activeDictatingRef.current.stop().catch(() => {});
        activeDictatingRef.current = null;
      }
    };
  }, []);

  // Configure WhatsApp header
  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: '#075E54',
      },
      headerTintColor: '#fff',
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <View style={[
            styles.headerAvatar,
            activePersona.department !== 'founder' && { backgroundColor: '#075E54' }
          ]}>
            {activePersona.avatarEmoji === '🤖' ? (
              <MaterialIcons name="smart-toy" size={20} color="#fff" />
            ) : (
              <Text style={{ fontSize: 18 }}>{activePersona.avatarEmoji}</Text>
            )}
            <View style={styles.onlineBadge} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>{activePersona.name}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {loading
                ? 'Thinking & executing...'
                : activePersona.department === 'founder'
                  ? 'AI Partner • Online'
                  : `${activePersona.roleTitle} • Online`}
            </Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleClearChat}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="delete-outline" size={22} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, loading, activePersona]);

  // Save chat history without any binary audio payloads
  const persistMessages = useCallback(async (newMsgs: ChatMessage[]) => {
    try {
      const uid = currentUserId || (await AsyncStorage.getItem('ruhvi_user_id'));
      if (uid) {
        const sanitized = newMsgs.map((m: any) => {
          if (m.audioBase64) {
            const { audioBase64, ...rest } = m;
            return rest;
          }
          return m;
        });
        const storageKey = activePersona.department === 'founder'
          ? `ruhvi_co_founder_chat_${uid}`
          : `ruhvi_ai_worker_chat_${activePersona.department}_${uid}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(sanitized));
      }
    } catch (e) {
      console.warn('Failed to persist messages:', e);
    }
  }, [currentUserId, activePersona.department]);

  // Check for proactive store alerts (tickets, low stock, anomaly signals)
  const checkForProactiveAlerts = useCallback(async () => {
    try {
      let token = authToken || (await AsyncStorage.getItem('ruhvi_mobile_jwt'));
      if (!token) return;

      for (const endpoint of CO_FOUNDER_ENDPOINTS) {
        try {
          const res = await fetch(endpoint, {
            method: 'GET',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.hasAlerts && data.proactiveMessage) {
              setActiveAlerts(data.alerts || []);

              // Check if top alert was already posted in this chat
              const lastAlertId = await AsyncStorage.getItem('ruhvi_last_proactive_alert_id');
              const currentAlertId = data.alerts?.[0]?.id || 'alert_active';

              if (lastAlertId !== currentAlertId) {
                await AsyncStorage.setItem('ruhvi_last_proactive_alert_id', currentAlertId);

                const alertMsg: ChatMessage = {
                  id: `proactive_${Date.now()}`,
                  sender: 'assistant',
                  text: data.proactiveMessage,
                  timestamp: Date.now(),
                  provider: 'Ruhvi Proactive System',
                  toolExecuted: true,
                };

                setMessages((prev) => {
                  if (prev.some((m) => m.text === data.proactiveMessage)) return prev;
                  const next = [...prev, alertMsg];
                  persistMessages(next);
                  return next;
                });
              }
            } else {
              setActiveAlerts([]);
            }
            break;
          }
        } catch {
          // ignore network glitch on GET
        }
      }
    } catch (err) {
      console.warn('Error checking proactive alerts:', err);
    }
  }, [authToken, persistMessages]);

  // Load user session & stored chat history
  useEffect(() => {
    const loadSession = async () => {
      try {
        const uid = await AsyncStorage.getItem('ruhvi_user_id');
        const token = await AsyncStorage.getItem('ruhvi_mobile_jwt');
        const cachedRole = await AsyncStorage.getItem('ruhvi_user_role');
        const cachedDept = await AsyncStorage.getItem('ruhvi_user_dept');
        setCurrentUserId(uid);
        setAuthToken(token);

        let currentPersona = initialPersona;
        if (!routeParams.department && routeParams.isCoFounder === undefined) {
          currentPersona = resolveAIWorkerForUser(cachedRole, cachedDept);
        }
        setActivePersona(currentPersona);

        if (uid) {
          const loadStarred = async (userId: string) => {
            try {
              const raw = await AsyncStorage.getItem(`@ruhvi_starred_ai_messages_${userId}`);
              if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                  setStarredMessageIds(new Set(arr));
                }
              }
            } catch (e) {
              console.warn('Failed to load starred ai messages:', e);
            }
          };
          loadStarred(uid);

          const storageKey = currentPersona.department === 'founder'
            ? `ruhvi_co_founder_chat_${uid}`
            : `ruhvi_ai_worker_chat_${currentPersona.department}_${uid}`;
          const stored = await AsyncStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sanitized = parsed.map((m: any) => {
                if (m.audioBase64) {
                  const { audioBase64, ...rest } = m;
                  return rest;
                }
                return m;
              });
              setMessages(sanitized);
              return;
            }
          }
          setMessages([
            {
              id: 'welcome',
              sender: 'assistant',
              text: currentPersona.welcomeMessage,
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (err) {
        console.warn('Error loading chat session:', err);
      }
    };
    loadSession();
  }, [routeParams.department, routeParams.isCoFounder, routeParams.name]);

  // Poll for proactive alerts on mount and every 45s (if co-founder)
  useEffect(() => {
    if (activePersona.department === 'founder') {
      checkForProactiveAlerts();
      const interval = setInterval(() => {
        checkForProactiveAlerts();
      }, 45000);
      return () => clearInterval(interval);
    }
  }, [checkForProactiveAlerts, activePersona.department]);

  const handleClearChat = () => {
    Alert.alert(
      'Clear Conversation',
      `Are you sure you want to clear this ${activePersona.name} conversation history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const reset: ChatMessage[] = [
              {
                id: 'welcome',
                sender: 'assistant',
                text: activePersona.welcomeMessage,
                timestamp: Date.now(),
              },
            ];
            setMessages(reset);
            persistMessages(reset);
            setActiveAlerts([]);
          },
        },
      ]
    );
  };

  // Message Action Handlers (WhatsApp Style)
  const handleCopyMessage = async (msg?: ChatMessage | null) => {
    const target = msg || actionMenuMessage;
    setActionMenuMessage(null);
    if (!target) return;
    const textToCopy = target.text || '';
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Message copied to clipboard', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied', 'Message copied to clipboard');
      }
    }
  };

  const handleOpenForward = (msg?: ChatMessage | null) => {
    const target = msg || actionMenuMessage;
    setActionMenuMessage(null);
    if (!target) return;
    setForwardTargetMessage(target);
    setIsForwardModalVisible(true);
  };

  const executeForward = async (targetConvId: string, _targetName?: string) => {
    if (!forwardTargetMessage) return;
    try {
      const uid = currentUserId || (await getCurrentUserId());
      if (!uid) {
        Alert.alert('Error', 'User authentication required to forward message');
        return;
      }

      const { data: newMsg, error: msgErr } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: targetConvId,
          sender_id: uid,
          sender_type: 'staff',
          content: forwardTargetMessage.text || (forwardTargetMessage.audioUrl ? '[Voice Note]' : '[Image]'),
          message_type: forwardTargetMessage.audioUrl ? 'voice_note' : 'text',
          metadata: {
            forwarded_from: activePersona.name,
            original_sender: forwardTargetMessage.sender,
          },
        })
        .select('id')
        .single();

      if (msgErr) throw msgErr;

      if (forwardTargetMessage.audioUrl && newMsg?.id) {
        try {
          await supabase.from('chat_voice_notes').insert({
            message_id: newMsg.id,
            audio_url: forwardTargetMessage.audioUrl,
            duration: forwardTargetMessage.duration || 0,
          });
        } catch (vnErr) {
          console.warn('Failed to insert forwarded voice note record:', vnErr);
        }
      }

      if (Platform.OS === 'android') {
        ToastAndroid.show('Message forwarded successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Message forwarded successfully');
      }
    } catch (err: any) {
      console.warn('Forward failed:', err);
      Alert.alert('Forward Failed', err.message || 'Could not forward message');
    } finally {
      setIsForwardModalVisible(false);
      setForwardTargetMessage(null);
    }
  };

  const handleToggleStarMessage = async (messageId: string) => {
    const uid = currentUserId || (await AsyncStorage.getItem('ruhvi_user_id'));
    const nextStarred = new Set(starredMessageIds);
    const willStar = !nextStarred.has(messageId);
    if (willStar) {
      nextStarred.add(messageId);
    } else {
      nextStarred.delete(messageId);
    }
    setStarredMessageIds(nextStarred);

    if (uid) {
      try {
        await AsyncStorage.setItem(
          `@ruhvi_starred_ai_messages_${uid}`,
          JSON.stringify(Array.from(nextStarred))
        );
      } catch (e) {
        console.warn('Failed to save starred state:', e);
      }
    }

    if (Platform.OS === 'android') {
      ToastAndroid.show(
        willStar ? 'Message Starred ⭐' : 'Message Unstarred',
        ToastAndroid.SHORT
      );
    } else {
      Alert.alert(willStar ? 'Starred ⭐' : 'Unstarred');
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Voice Note Recording
  const handleStartRecording = async () => {
    try {
      const recording = await startAudioRecording();
      if (recording) {
        setRecordingRef(recording);
        activeRecordingRef.current = recording;
        setIsRecordingVoice(true);
        setRecordDuration(0);
        const timer = setInterval(() => {
          setRecordDuration((prev) => prev + 1);
        }, 1000);
        setRecordTimer(timer);
        recordTimerRef.current = timer;
      }
    } catch (err: any) {
      Alert.alert('Microphone Error', err.message || 'Could not start audio recording');
    }
  };

  const handleCancelRecording = async () => {
    try {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
      setRecordTimer(null);
      const rec = activeRecordingRef.current || recordingRef;
      if (rec) {
        await rec.stop().catch(() => { });
      }
    } catch (e) {
      console.warn('Cancel recording error:', e);
    } finally {
      activeRecordingRef.current = null;
      setRecordingRef(null);
      setIsRecordingVoice(false);
      setRecordDuration(0);
    }
  };

  const handleSendVoiceNote = async () => {
    try {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
      setRecordTimer(null);

      const recording = activeRecordingRef.current || recordingRef;
      if (!recording) return;

      activeRecordingRef.current = null;
      setRecordingRef(null);
      setUploadingVoice(true);

      const audioData = await stopAudioRecording(recording);
      setIsRecordingVoice(false);

      if (!audioData) {
        setUploadingVoice(false);
        return;
      }

      let token = authToken;
      if (!token) {
        token = await AsyncStorage.getItem('ruhvi_mobile_jwt');
        setAuthToken(token);
      }

      // 1. Upload voice note
      const uploaded = await uploadVoiceNote(audioData.uri, audioData.durationSeconds, audioData.mimeType);

      // 2. Transcribe voice note for AI reasoning
      let transcriptionText = '';
      let detectedLang: string | undefined = undefined;
      try {
        const trRes = await transcribeAudioDetailed(
          audioData.uri,
          token || undefined,
          audioData.mimeType
        );
        if (trRes?.transcript) {
          transcriptionText = trRes.transcript.trim();
          detectedLang = trRes.detectedLanguage;
        }
      } catch (sttErr) {
        console.warn('Voice transcription for AI failed:', sttErr);
      }

      const durationSeconds = audioData.durationSeconds || 1;
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_u`,
        sender: 'user',
        text: transcriptionText ? transcriptionText : `[Voice Note (${durationSeconds}s)]`,
        audioUrl: uploaded?.url || audioData.uri,
        duration: durationSeconds,
        timestamp: Date.now(),
      };

      const updatedList = [...messages, userMsg];
      setMessages(updatedList);
      setLoading(true);
      persistMessages(updatedList);

      // Call AI with user's voice message transcription
      const isCoFounder = activePersona.department === 'founder';
      const endpoints = isCoFounder ? CO_FOUNDER_ENDPOINTS : AI_WORKER_ENDPOINTS;

      const payloadMessages = updatedList.map((m, idx) => ({
        sender: m.sender,
        text: m.text,
        imageUrl: m.imageUrl,
        audioUrl: idx === updatedList.length - 1 ? m.audioUrl : undefined,
      }));

      const requestBody = isCoFounder
        ? {
          messages: payloadMessages,
          channel: 'voice_note',
          provider: 'gemini',
          model: 'gemini-3.5-flash-lite',
          agenticLoop: true,
          ...(detectedLang && detectedLang !== 'none' ? { language: detectedLang } : {}),
        }
        : {
          messages: payloadMessages,
          department: activePersona.department,
          ...(detectedLang && detectedLang !== 'none' ? { language: detectedLang } : {}),
        };

      let responseReceived = false;
      let assistantReply = '';
      let usedProvider = '';
      let usedModel = '';
      let toolExecuted = false;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(requestBody),
          });

          if (res.ok) {
            const data = await res.json();
            assistantReply = data.response || 'Action completed.';
            usedProvider = data.provider || '';
            usedModel = data.model || '';
            toolExecuted = Boolean(
              data.agent?.toolCallsExecuted?.length || data.toolCallsExecuted?.length
            );
            responseReceived = true;
            break;
          } else if (res.status === 401 || res.status === 403) {
            const errData = await res.json().catch(() => ({}));
            assistantReply =
              errData.error ||
              'Authentication issue: Please verify your staff permissions or re-login.';
            responseReceived = true;
            break;
          }
        } catch (networkErr) {
          console.warn(`Endpoint ${endpoint} failed:`, networkErr);
        }
      }

      if (!responseReceived) {
        assistantReply = `I received your voice note: "${transcriptionText || 'Voice message'}", but could not connect to the Ruhvi ${activePersona.name} server.`;
      }

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        sender: 'assistant',
        text: assistantReply,
        timestamp: Date.now(),
        provider: usedProvider,
        model: usedModel,
        toolExecuted,
      };

      const finalList = [...updatedList, aiMsg];
      setMessages(finalList);
      persistMessages(finalList);
    } catch (err: any) {
      Alert.alert('Error Sending Voice Note', err.message || 'Failed to send voice note');
    } finally {
      setUploadingVoice(false);
      setLoading(false);
      setRecordDuration(0);
    }
  };

  // Speech-to-Text (STT) Dictation
  const handleToggleDictation = async () => {
    if (isDictating) {
      setIsDictating(false);
      setTranscribing(true);
      const rec = activeDictatingRef.current || dictatingRef;
      activeDictatingRef.current = null;
      setDictatingRef(null);
      try {
        if (rec) {
          const audioData = await stopAudioRecording(rec);
          if (audioData) {
            let token = authToken;
            if (!token) {
              token = await AsyncStorage.getItem('ruhvi_mobile_jwt');
              setAuthToken(token);
            }
            const trRes = await transcribeAudioDetailed(
              audioData.uri,
              token || undefined,
              audioData.mimeType
            );
            if (trRes?.transcript) {
              setInputText((prev) =>
                prev ? `${prev} ${trRes.transcript.trim()}` : trRes.transcript.trim()
              );
              if (Platform.OS === 'android') {
                const langLabel =
                  trRes.detectedLanguage === 'bn'
                    ? 'বাংলা'
                    : trRes.detectedLanguage === 'banglish'
                    ? 'Banglish'
                    : trRes.detectedLanguage === 'hi'
                    ? 'हिंदी'
                    : trRes.detectedLanguage === 'hinglish'
                    ? 'Hinglish'
                    : trRes.detectedLanguage === 'en'
                    ? 'English'
                    : '';
                ToastAndroid.show(
                  `Dictated text added${langLabel ? ` (${langLabel})` : ''}`,
                  ToastAndroid.SHORT
                );
              }
            } else {
              if (Platform.OS === 'android') {
                ToastAndroid.show('No speech detected. Try speaking closer to mic.', ToastAndroid.SHORT);
              }
            }
          }
        }
      } catch (err: any) {
        Alert.alert('Transcription Failed', err.message || 'Could not convert audio to text');
      } finally {
        setTranscribing(false);
      }
    } else {
      try {
        const recording = await startAudioRecording();
        if (recording) {
          setDictatingRef(recording);
          activeDictatingRef.current = recording;
          setIsDictating(true);
          if (Platform.OS === 'android') {
            ToastAndroid.show('Listening... Speak now 🎙️', ToastAndroid.SHORT);
          }
        }
      } catch (err: any) {
        Alert.alert('Microphone Error', err.message || 'Could not access microphone');
      }
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are needed to attach images.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setAttachedImage({ uri: asset.uri });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is needed to take a photo.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setAttachedImage({ uri: asset.uri });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not capture photo');
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        let content = '';
        const lower = (asset.name || '').toLowerCase();
        if (
          lower.endsWith('.md') ||
          lower.endsWith('.markdown') ||
          lower.endsWith('.txt') ||
          lower.endsWith('.html') ||
          lower.endsWith('.htm') ||
          lower.endsWith('.csv') ||
          lower.endsWith('.json')
        ) {
          try {
            content = await FileSystem.readAsStringAsync(asset.uri);
          } catch (e) {
            console.warn('Could not read file text:', e);
          }
        }
        setAttachedDoc({
          uri: asset.uri,
          name: asset.name || `Document_${Date.now()}`,
          size: asset.size,
          mimeType: asset.mimeType || 'application/octet-stream',
          content,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick document');
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      `Attach for ${activePersona.name}`,
      'Share photos, documents, markdown, HTML, or spreadsheets for analysis:',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose Image from Gallery', onPress: handlePickImage },
        { text: 'Attach Document (.pdf, .md, .html, .csv)', onPress: handlePickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !attachedImage && !attachedDoc) || loading) return;

    let token = authToken;
    if (!token) {
      token = await AsyncStorage.getItem('ruhvi_mobile_jwt');
      setAuthToken(token);
    }

    let imageUrl: string | undefined = undefined;

    // Upload attached image if present
    if (attachedImage) {
      try {
        setUploadingImage(true);
        const uploadRes = await uploadToCloudinary(
          attachedImage.uri,
          `ai_worker_mobile_${Date.now()}.jpg`,
          'image/jpeg'
        );
        if (uploadRes?.cloudinary_url) {
          imageUrl = uploadRes.cloudinary_url;
        }
      } catch (uploadErr) {
        console.warn('Image upload error:', uploadErr);
      } finally {
        setUploadingImage(false);
      }
    }

    let attachedFiles: FileItem[] | undefined = undefined;

    // Upload attached document if present
    if (attachedDoc) {
      try {
        setUploadingDoc(true);
        const uploadRes = await uploadToCloudinary(
          attachedDoc.uri,
          attachedDoc.name,
          attachedDoc.mimeType || 'application/octet-stream',
          attachedDoc.size
        );
        if (uploadRes?.cloudinary_url) {
          attachedFiles = [
            {
              fileName: attachedDoc.name,
              fileType: attachedDoc.name.split('.').pop() || 'document',
              fileUrl: uploadRes.cloudinary_url,
              fileSize: attachedDoc.size,
              mimeType: attachedDoc.mimeType,
              rawContent: attachedDoc.content,
              contentPreview: attachedDoc.content ? attachedDoc.content.slice(0, 300) : undefined,
            },
          ];
        }
      } catch (docErr) {
        console.warn('Document upload error:', docErr);
      } finally {
        setUploadingDoc(false);
      }
    }

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text:
        trimmed ||
        (imageUrl
          ? 'Please review this attached image and share your analysis.'
          : attachedDoc
            ? `Please review this attached file: ${attachedDoc.name}`
            : ''),
      imageUrl,
      files: attachedFiles,
      timestamp: Date.now(),
    };

    const updatedList = [...messages, userMsg];
    setMessages(updatedList);
    setInputText('');
    setAttachedImage(null);
    setAttachedDoc(null);
    setLoading(true);
    persistMessages(updatedList);

    // Prepare history payload for Agent Loop including doc text if available
    const docPromptSuffix = attachedDoc?.content
      ? `\n\n[Attached File Content for ${attachedDoc.name}]:\n${attachedDoc.content.slice(0, 4000)}`
      : attachedFiles?.[0]?.fileUrl
        ? `\n\n[Attached Document URL for ${attachedDoc?.name}]: ${attachedFiles[0].fileUrl}`
        : '';

    const payloadMessages = updatedList.map((m, idx) => ({
      sender: m.sender,
      text: idx === updatedList.length - 1 ? `${m.text}${docPromptSuffix}` : m.text,
      imageUrl: m.imageUrl,
    }));

    let responseReceived = false;
    let assistantReply = '';
    let usedProvider = '';
    let usedModel = '';
    let toolExecuted = false;
    let createdFilesFromAi: FileItem[] | undefined = undefined;

    const isCoFounder = activePersona.department === 'founder';
    const endpoints = isCoFounder ? CO_FOUNDER_ENDPOINTS : AI_WORKER_ENDPOINTS;

    const requestBody = isCoFounder
      ? {
        messages: payloadMessages,
        channel: 'text',
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        agenticLoop: true,
      }
      : {
        messages: payloadMessages,
        department: activePersona.department,
      };

    // Try primary then fallback endpoint
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(requestBody),
        });

        if (res.ok) {
          const data = await res.json();
          assistantReply = data.response || 'Action completed.';
          usedProvider = data.provider || '';
          usedModel = data.model || '';
          toolExecuted = Boolean(
            data.agent?.toolCallsExecuted?.length || data.toolCallsExecuted?.length
          );
          if (Array.isArray(data.files) && data.files.length > 0) {
            createdFilesFromAi = data.files;
          }
          responseReceived = true;
          break;
        } else if (res.status === 401 || res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          assistantReply =
            errData.error ||
            'Authentication issue: Please verify your staff permissions or re-login.';
          responseReceived = true;
          break;
        }
      } catch (networkErr) {
        console.warn(`Endpoint ${endpoint} failed:`, networkErr);
      }
    }

    if (!responseReceived) {
      assistantReply = `I could not connect to the Ruhvi ${activePersona.name} server. Please ensure your internet connection is active.`;
    }

    const aiMsg: ChatMessage = {
      id: `msg_${Date.now()}_ai`,
      sender: 'assistant',
      text: assistantReply,
      files: createdFilesFromAi,
      timestamp: Date.now(),
      provider: usedProvider,
      model: usedModel,
      toolExecuted,
    };

    const finalList = [...updatedList, aiMsg];
    setMessages(finalList);
    persistMessages(finalList);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    const isStarred = starredMessageIds.has(item.id);
    const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={[
            styles.bubbleAvatar,
            activePersona.department !== 'founder' && { backgroundColor: '#075E54', borderColor: '#A7F3D0' }
          ]}>
            {activePersona.avatarEmoji === '🤖' ? (
              <MaterialIcons name="smart-toy" size={13} color="#fff" />
            ) : (
              <Text style={{ fontSize: 12 }}>{activePersona.avatarEmoji}</Text>
            )}
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.92}
          onLongPress={() => setActionMenuMessage(item)}
          style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
        >
          {!isUser && (
            <View style={styles.aiSenderHeader}>
              <Text style={[styles.aiSenderTitle, activePersona.department !== 'founder' && { color: '#075E54' }]}>
                {activePersona.name}
              </Text>
              {item.toolExecuted && (
                <View style={styles.toolBadge}>
                  <MaterialIcons name="bolt" size={10} color="#075E54" />
                  <Text style={styles.toolBadgeText}>Action Done</Text>
                </View>
              )}
            </View>
          )}

          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.attachedImagePreview}
              resizeMode="cover"
            />
          )}

          {item.audioUrl ? (
            <View>
              <VoiceNotePlayer
                audioUrl={item.audioUrl}
                durationSeconds={item.duration || 0}
                isMe={isUser}
              />
              {item.text && !item.text.startsWith('[Voice Note') ? (
                <Text style={[{ fontSize: 13, marginTop: 6, fontStyle: 'italic', opacity: 0.9 }, isUser ? styles.userText : styles.aiText]}>
                  💬 {item.text}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
              {item.text}
            </Text>
          )}

          {/* File Attachments (Markdown, HTML, PDF, CSV, etc.) */}
          {item.files && item.files.length > 0 && (
            <View style={{ marginVertical: 4 }}>
              {item.files.map((fileItem, fIdx) => (
                <FileAttachmentCard
                  key={`file_${item.id}_${fIdx}`}
                  file={fileItem}
                  isMe={isUser}
                />
              ))}
            </View>
          )}

          <View style={styles.bubbleMeta}>
            {isStarred && (
              <MaterialIcons name="star" size={13} color="#EAB308" style={{ marginRight: 4 }} />
            )}
            <Text style={styles.timeText}>{timeStr}</Text>
            {isUser && (
              <MaterialIcons name="done-all" size={14} color="#34B7F1" style={styles.ticks} />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      {/* Proactive Live Alert Banner */}
      {activeAlerts.length > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          activeOpacity={0.8}
          onPress={() => {
            setInputText(`Explain details of alert: ${activeAlerts[0]?.title}`);
          }}
        >
          <MaterialIcons name="notifications-active" size={18} color="#C2410C" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertBannerTitle} numberOfLines={1}>
              {activeAlerts[0]?.title}
            </Text>
            <Text style={styles.alertBannerText} numberOfLines={1}>
              {activeAlerts[0]?.message}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#C2410C" />
        </TouchableOpacity>
      )}

      {/* Chat message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          <View style={styles.dateBadgeWrap}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>TODAY</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.typingContainer}>
              <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#075E54" style={{ marginRight: 8 }} />
                <Text style={styles.typingText}>{workerDisplayName} is executing...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Selected Image Preview strip */}
      {attachedImage && (
        <View style={styles.imagePreviewBar}>
          <Image source={{ uri: attachedImage.uri }} style={styles.imageThumbnail} />
          <Text style={styles.imageLabel}>Image attached for {workerDisplayName}</Text>
          <TouchableOpacity
            onPress={() => setAttachedImage(null)}
            style={styles.removeImageBtn}
          >
            <MaterialIcons name="close" size={20} color="#d32f2f" />
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Document Preview strip */}
      {attachedDoc && (
        <View style={styles.docPreviewBar}>
          <View style={styles.docPreviewIconWrap}>
            <MaterialIcons name="insert-drive-file" size={22} color="#075E54" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docPreviewName} numberOfLines={1}>
              {attachedDoc.name}
            </Text>
            <Text style={styles.docPreviewSize}>
              File attached for {workerDisplayName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setAttachedDoc(null)}
            style={styles.removeImageBtn}
          >
            <MaterialIcons name="close" size={20} color="#d32f2f" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar / Voice Note Bar (WhatsApp style) */}
      {isRecordingVoice ? (
        <View style={styles.recordingBar}>
          <TouchableOpacity
            onPress={handleCancelRecording}
            style={styles.recordingDiscardBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete" size={24} color="#EF4444" />
          </TouchableOpacity>
          <View style={styles.recordingStatusWrap}>
            <View style={styles.recordingPulseDot} />
            <Text style={styles.recordingTimerText}>{formatTimer(recordDuration)}</Text>
            <Text style={styles.recordingLabel}>Recording Voice Note...</Text>
          </View>
          <TouchableOpacity
            onPress={handleSendVoiceNote}
            style={styles.recordingSendBtn}
            disabled={uploadingVoice}
            activeOpacity={0.8}
          >
            {uploadingVoice ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={showAttachmentOptions}
            activeOpacity={0.7}
            disabled={loading || uploadingVoice}
          >
            <MaterialIcons name="attach-file" size={24} color="#54656F" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sttBtn, isDictating && styles.sttBtnActive]}
            onPress={handleToggleDictation}
            activeOpacity={0.7}
            disabled={loading || uploadingVoice}
          >
            {transcribing ? (
              <ActivityIndicator size="small" color="#075E54" />
            ) : (
              <MaterialIcons
                name="graphic-eq"
                size={22}
                color={isDictating ? '#EF4444' : '#54656F'}
              />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.inputField}
            placeholder={
              isDictating
                ? 'Listening... Speak now'
                : `Ask ${workerDisplayName} or give instructions...`
            }
            placeholderTextColor={isDictating ? '#EF4444' : '#8696A0'}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!loading && !uploadingVoice}
          />

          {inputText.trim() || attachedImage || attachedDoc ? (
            <TouchableOpacity
              style={[
                styles.sendBtn,
                loading || uploadingImage || uploadingDoc ? styles.sendBtnDisabled : null,
              ]}
              onPress={handleSend}
              disabled={loading || uploadingImage || uploadingDoc}
              activeOpacity={0.8}
            >
              {uploadingImage || uploadingDoc || loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.micBtn}
              onPress={handleStartRecording}
              disabled={loading || uploadingVoice}
              activeOpacity={0.8}
            >
              <MaterialIcons name="mic" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* WhatsApp Long-Press Action Modal */}
      <Modal
        visible={!!actionMenuMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuMessage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuMessage(null)}
        >
          <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle} numberOfLines={1}>
                {actionMenuMessage?.text || 'Message Options'}
              </Text>
            </View>

            {/* Copy Message */}
            {actionMenuMessage?.text ? (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleCopyMessage(actionMenuMessage)}
              >
                <MaterialIcons name="content-copy" size={22} color="#075E54" style={{ marginRight: 12 }} />
                <Text style={styles.actionMenuItemText}>Copy message (কপি)</Text>
              </TouchableOpacity>
            ) : null}

            {/* Forward Message */}
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleOpenForward(actionMenuMessage)}
            >
              <MaterialIcons name="forward" size={22} color="#128C7E" style={{ marginRight: 12 }} />
              <Text style={styles.actionMenuItemText}>Forward message (ফরওয়ার্ড)</Text>
            </TouchableOpacity>

            {/* Star / Unstar Message */}
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                const msgId = actionMenuMessage?.id;
                if (msgId) {
                  setActionMenuMessage(null);
                  handleToggleStarMessage(msgId);
                }
              }}
            >
              <MaterialIcons
                name={actionMenuMessage && starredMessageIds.has(actionMenuMessage.id) ? 'star' : 'star-outline'}
                size={22}
                color="#D97706"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.actionMenuItemText}>
                {actionMenuMessage && starredMessageIds.has(actionMenuMessage.id)
                  ? 'Unstar message (স্টার বাতিল)'
                  : 'Star message (স্টার মার্ক)'}
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => setActionMenuMessage(null)}
            >
              <MaterialIcons name="close" size={22} color="#EF4444" style={{ marginRight: 12 }} />
              <Text style={[styles.actionMenuItemText, { color: '#EF4444' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Modal */}
      <ForwardMessageModal
        visible={isForwardModalVisible}
        messageText={
          forwardTargetMessage
            ? forwardTargetMessage.text ||
            (forwardTargetMessage.audioUrl ? '🎵 Voice Note' : '📷 Image')
            : ''
        }
        onClose={() => {
          setIsForwardModalVisible(false);
          setForwardTargetMessage(null);
        }}
        onForward={executeForward}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD', // WhatsApp background tone
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED', // Premium AI Violet
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#25D366',
    borderWidth: 1.5,
    borderColor: '#075E54',
  },
  headerTextWrap: {
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#D1E7DD',
  },
  headerBtn: {
    padding: 6,
    marginRight: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
  },
  dateBadgeWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateBadge: {
    backgroundColor: '#D1D7DB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#54656F',
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  bubbleAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7C3AED',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#E7FFDB', // WhatsApp User Bubble
    borderTopRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  aiSenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  aiSenderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6A1B9A',
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  toolBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#075E54',
    marginLeft: 2,
  },
  attachedImagePreview: {
    width: 200,
    height: 140,
    borderRadius: 8,
    marginBottom: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: '#111B21',
  },
  aiText: {
    color: '#111B21',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#667781',
  },
  ticks: {
    marginLeft: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    marginLeft: 28,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#075E54',
    fontStyle: 'italic',
  },
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 4,
    marginRight: 10,
  },
  imageLabel: {
    flex: 1,
    fontSize: 12,
    color: '#54656F',
  },
  docPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  docPreviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docPreviewName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docPreviewSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  removeImageBtn: {
    padding: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#D1D7DB',
  },
  attachBtn: {
    padding: 8,
    marginBottom: 2,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    fontSize: 15,
    color: '#111B21',
    marginHorizontal: 4,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#A0B4B0',
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sttBtn: {
    padding: 8,
    marginBottom: 2,
  },
  sttBtnActive: {
    backgroundColor: '#FEE2E2',
    borderRadius: 18,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#D1D7DB',
  },
  recordingDiscardBtn: {
    padding: 8,
    marginRight: 6,
  },
  recordingStatusWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingTimerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111B21',
    marginRight: 8,
  },
  recordingLabel: {
    fontSize: 12,
    color: '#667781',
  },
  recordingSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  actionMenuHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    marginBottom: 8,
  },
  actionMenuTitle: {
    fontSize: 13,
    color: '#718096',
    fontStyle: 'italic',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  actionMenuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  alertBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  alertBannerText: {
    fontSize: 11,
    color: '#C2410C',
    marginTop: 1,
  },
});

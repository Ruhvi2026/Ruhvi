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
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../lib/cloudinary';
import {
  AI_WORKER_PERSONAS,
  resolveAIWorkerForUser,
  AIWorkerPersona,
} from '../lib/personas';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ uri: string; url?: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

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

  // Save chat history
  const persistMessages = useCallback(async (newMsgs: ChatMessage[]) => {
    try {
      const uid = currentUserId || (await AsyncStorage.getItem('ruhvi_user_id'));
      if (uid) {
        const storageKey = activePersona.department === 'founder'
          ? `ruhvi_co_founder_chat_${uid}`
          : `ruhvi_ai_worker_chat_${activePersona.department}_${uid}`;
        await AsyncStorage.setItem(storageKey, JSON.stringify(newMsgs));
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
          const storageKey = currentPersona.department === 'founder'
            ? `ruhvi_co_founder_chat_${uid}`
            : `ruhvi_ai_worker_chat_${currentPersona.department}_${uid}`;
          const stored = await AsyncStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
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

  const showAttachmentOptions = () => {
    Alert.alert(
      `Attach Image for ${activePersona.name}`,
      'Share product photos, defect photos, or documents for visual analysis:',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !attachedImage) || loading) return;

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

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text: trimmed || (imageUrl ? 'Please review this attached image and share your analysis.' : ''),
      imageUrl,
      timestamp: Date.now(),
    };

    const updatedList = [...messages, userMsg];
    setMessages(updatedList);
    setInputText('');
    setAttachedImage(null);
    setLoading(true);
    persistMessages(updatedList);

    // Prepare history payload for Agent Loop
    const payloadMessages = updatedList.map((m) => ({
      sender: m.sender,
      text: m.text,
      imageUrl: m.imageUrl,
    }));

    let responseReceived = false;
    let assistantReply = '';
    let usedProvider = '';
    let usedModel = '';
    let toolExecuted = false;

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
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
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

          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>

          <View style={styles.bubbleMeta}>
            <Text style={styles.timeText}>{timeStr}</Text>
            {isUser && (
              <MaterialIcons name="done-all" size={14} color="#34B7F1" style={styles.ticks} />
            )}
          </View>
        </View>
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

        {/* Input Bar (WhatsApp style) */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={showAttachmentOptions}
            activeOpacity={0.7}
          >
            <MaterialIcons name="attach-file" size={24} color="#54656F" />
          </TouchableOpacity>

          <TextInput
            style={styles.inputField}
            placeholder={`Ask ${workerDisplayName} or give instructions...`}
            placeholderTextColor="#8696A0"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() && !attachedImage) || loading ? styles.sendBtnDisabled : null,
            ]}
            onPress={handleSend}
            disabled={(!inputText.trim() && !attachedImage) || loading || uploadingImage}
            activeOpacity={0.8}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
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

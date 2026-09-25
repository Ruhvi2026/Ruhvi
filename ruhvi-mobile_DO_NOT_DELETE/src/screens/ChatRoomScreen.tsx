import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  RefreshControl,
  Image,
  Modal,
  Alert,
  Linking,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { ChatMessage, ChatAttachment } from '../types/chat';
import AutoLinkText from '../components/AutoLinkText';
import { triggerLocalNotification, dispatchChatPushNotification } from '../lib/notifications';

export default function ChatRoomScreen({ route, navigation }: any) {
  const { id, isGroup } = route.params;
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Attachment Sheet & Preview State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('staff');

  // In-Chat Search State (WhatsApp style)
  const [isSearchingInChat, setIsSearchingInChat] = useState<boolean>(!!route.params?.initialSearchQuery);
  const [inChatSearchQuery, setInChatSearchQuery] = useState<string>(route.params?.initialSearchQuery || '');

  // Reply State (WhatsApp style)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const [actionMenuMessage, setActionMenuMessage] = useState<ChatMessage | null>(null);

  // Order Search (#) & Order Details Modal State
  const [orderQuery, setOrderQuery] = useState<string | null>(null);
  const [orderSuggestions, setOrderSuggestions] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState<boolean>(false);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState<boolean>(false);

  // Mention (@) Modals (User profile & Department)
  const [selectedStaffUser, setSelectedStaffUser] = useState<any | null>(null);
  const [showStaffProfileModal, setShowStaffProfileModal] = useState<boolean>(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [showDeptModal, setShowDeptModal] = useState<boolean>(false);

  // Mentions & Entity References State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [entityType, setEntityType] = useState<'order' | 'support_ticket' | 'product'>('order');
  const [entityId, setEntityId] = useState('');
  const [pendingEntityRefs, setPendingEntityRefs] = useState<any[]>([]);

  // Pinned Message State
  const [pinnedMessage, setPinnedMessage] = useState<any | null>(null);

  // In-Chat Media Library State
  const [showMediaLibrary, setShowMediaLibrary] = useState<boolean>(false);
  const [mediaTab, setMediaTab] = useState<'photos' | 'docs'>('photos');
  const [mediaLibraryItems, setMediaLibraryItems] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(false);

  // Group Info & Avatar Customization State
  const [showGroupInfoModal, setShowGroupInfoModal] = useState<boolean>(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [editingGroupName, setEditingGroupName] = useState<string>('');
  const [editingGroupTopic, setEditingGroupTopic] = useState<string>('');
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  const [updatingGroup, setUpdatingGroup] = useState<boolean>(false);

  useEffect(() => {
    const initAuth = async () => {
      let uid = getCurrentUserId();
      if (!uid) {
        uid = await AsyncStorage.getItem('ruhvi_user_id');
      }
      setCurrentUserIdState(uid);
      if (uid) {
        const { data: u } = await supabase.from('users').select('role').eq('id', uid).single();
        if (u?.role) setUserRole(u.role);
      }
      markAsRead(uid);

      // Fetch staff directory for @mentions
      try {
        const { data: staff } = await supabase.rpc('get_staff_directory');
        if (staff) setStaffList(staff);
      } catch (e) {
        console.error('Failed to load staff directory', e);
      }
    };
    initAuth();
    fetchConversation();
  }, [id]);

  const fetchConversation = async () => {
    try {
      const { data } = await supabase
        .from('chat_conversations')
        .select(`
          id, type, group_name, group_avatar_url, group_topic, archived_at, created_by, allow_replies, pinned_message_id,
          pinned_message:pinned_message_id (
            id,
            text_content,
            message_type,
            created_at,
            sender:sender_id (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('id', id)
        .single();
      if (data) {
        setConversation(data);
        if (data.pinned_message) {
          setPinnedMessage(data.pinned_message);
        } else if (!data.pinned_message_id) {
          setPinnedMessage(null);
        }
        if (data.group_name) setEditingGroupName(data.group_name);
        if (data.group_topic) setEditingGroupTopic(data.group_topic);
        if (data.group_avatar_url) setGroupAvatarUrl(data.group_avatar_url);
      }
    } catch (e) {
      console.warn('Error fetching conversation:', e);
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const { data } = await supabase
        .from('chat_conversation_members')
        .select(`
          role,
          joined_at,
          user:user_id (
            id,
            full_name,
            email,
            department,
            role,
            avatar_url,
            bio
          )
        `)
        .eq('conversation_id', id);
      if (data) {
        setGroupMembers(data.map((m: any) => ({ ...m.user, member_role: m.role })));
      }
    } catch (e) {
      console.warn('Error fetching group members:', e);
    }
  };

  const openMediaLibrary = async () => {
    setShowMediaLibrary(true);
    setLoadingMedia(true);
    try {
      const { data } = await supabase
        .from('chat_attachments')
        .select(`
          id,
          message_id,
          cloudinary_url,
          resource_type,
          file_name,
          file_size,
          mime_type,
          created_at,
          message:message_id (
            id,
            conversation_id,
            created_at,
            sender:sender_id (
              id,
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (data) {
        const roomMedia = data.filter((a: any) => a.message?.conversation_id === id);
        setMediaLibraryItems(roomMedia);
      }
    } catch (e) {
      console.warn('Error fetching media attachments:', e);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleShowInChat = (targetMessageId: string) => {
    setShowMediaLibrary(false);
    setPreviewImageUrl(null);
    const idx = filteredMessages.findIndex(m => m.id === targetMessageId);
    if (idx >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      }, 300);
    } else {
      Alert.alert('In Chat', 'This media item belongs to earlier conversation history.');
    }
  };

  const handlePinMessage = async (msg: ChatMessage) => {
    setActionMenuMessage(null);
    let uid = currentUserId || getCurrentUserId();
    if (!uid) uid = await AsyncStorage.getItem('ruhvi_user_id');
    if (!uid) return;

    try {
      const { error } = await supabase.rpc('pin_chat_message', {
        p_conversation_id: id,
        p_message_id: msg.id,
        p_user_id: uid,
      });
      if (error) {
        Alert.alert('Error', error.message || 'Could not pin message');
      } else {
        setPinnedMessage(msg);
        setConversation((prev: any) => prev ? { ...prev, pinned_message_id: msg.id } : prev);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleUnpinMessage = async () => {
    try {
      const { error } = await supabase.rpc('unpin_chat_message', {
        p_conversation_id: id,
      });
      if (error) {
        Alert.alert('Error', error.message || 'Could not unpin message');
      } else {
        setPinnedMessage(null);
        setConversation((prev: any) => prev ? { ...prev, pinned_message_id: null } : prev);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handlePickGroupAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permission is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUpdatingGroup(true);
        const asset = result.assets[0];
        const payload = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const uploaded = await uploadToCloudinary(payload, `group_${id}_${Date.now()}.jpg`, 'image/jpeg');
        if (uploaded?.cloudinary_url) {
          setGroupAvatarUrl(uploaded.cloudinary_url);
          await supabase.rpc('update_group_info', {
            p_conversation_id: id,
            p_group_avatar_url: uploaded.cloudinary_url,
          });
          setConversation((prev: any) => prev ? { ...prev, group_avatar_url: uploaded.cloudinary_url } : prev);
          Alert.alert('Updated', 'Group icon updated successfully.');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update group icon');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleSaveGroupInfo = async () => {
    if (!editingGroupName.trim()) {
      Alert.alert('Required', 'Group name cannot be empty.');
      return;
    }
    setUpdatingGroup(true);
    try {
      const { error } = await supabase.rpc('update_group_info', {
        p_conversation_id: id,
        p_group_name: editingGroupName.trim(),
        p_group_topic: editingGroupTopic.trim(),
      });
      if (error) {
        Alert.alert('Error', error.message || 'Could not update group details');
      } else {
        setConversation((prev: any) => prev ? {
          ...prev,
          group_name: editingGroupName.trim(),
          group_topic: editingGroupTopic.trim(),
        } : prev);
        Alert.alert('Saved', 'Group details updated successfully.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdatingGroup(false);
    }
  };

  const markAsRead = useCallback(async (activeUid?: string | null) => {
    const uid = activeUid || currentUserId;
    if (!uid || !id) return;
    try {
      await supabase.rpc('mark_conversation_messages_as_read', {
        p_conversation_id: id,
        p_user_id: uid,
      });
    } catch (e) {
      console.warn('Error marking messages as read:', e);
    }
  }, [id, currentUserId]);

  const handleArchiveChat = () => {
    Alert.alert(
      'Resolve & Archive Chat',
      'Is this issue resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Resolve & Archive',
          style: 'default',
          onPress: async () => {
            let uid = currentUserId || getCurrentUserId();
            if (!uid) uid = await AsyncStorage.getItem('ruhvi_user_id');
            const { error } = await supabase.rpc('archive_chat_conversation', {
              p_conversation_id: id,
              p_user_id: uid,
            });
            if (error) {
              Alert.alert('Error', error.message || 'Could not archive chat');
            } else {
              Alert.alert('Resolved', 'Chat has been marked as resolved and archived.');
              fetchConversation();
              fetchMessages(false);
            }
          },
        },
      ]
    );
  };

  const handleUnarchiveChat = () => {
    Alert.alert(
      'Reopen Chat',
      'Do you want to reopen this archived conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen Chat',
          onPress: async () => {
            let uid = currentUserId || getCurrentUserId();
            if (!uid) uid = await AsyncStorage.getItem('ruhvi_user_id');
            const { error } = await supabase.rpc('unarchive_chat_conversation', {
              p_conversation_id: id,
              p_user_id: uid,
            });
            if (error) {
              Alert.alert('Error', error.message || 'Could not reopen chat');
            } else {
              Alert.alert('Reopened', 'Chat has been reopened.');
              fetchConversation();
              fetchMessages(false);
            }
          },
        },
      ]
    );
  };

  // Configure navigation header with search, media library, group info, and archive actions
  useEffect(() => {
    navigation.setOptions({
      headerTitle: conversation?.group_name || route.params?.title || 'Chat',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              setIsSearchingInChat((prev) => {
                if (prev) setInChatSearchQuery('');
                return !prev;
              });
            }}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
          >
            <MaterialIcons name={isSearchingInChat ? "close" : "search"} size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openMediaLibrary}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
          >
            <MaterialIcons name="photo-library" size={22} color="#fff" />
          </TouchableOpacity>

          {isGroup && (
            <TouchableOpacity
              onPress={() => {
                setEditingGroupName(conversation?.group_name || '');
                setEditingGroupTopic(conversation?.group_topic || '');
                setGroupAvatarUrl(conversation?.group_avatar_url || null);
                fetchGroupMembers();
                setShowGroupInfoModal(true);
              }}
              style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            >
              <MaterialIcons name="info-outline" size={23} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={conversation?.archived_at ? handleUnarchiveChat : handleArchiveChat}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={conversation?.archived_at ? "unarchive" : "archive"} 
              size={22} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [conversation, navigation, currentUserId, isSearchingInChat, isGroup]);

  const fetchMessages = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            email,
            department
          ),
          reply_to:reply_to_id (
            id,
            text_content,
            message_type,
            sender:sender_id (
              id,
              full_name,
              email
            )
          ),
          chat_attachments (*),
          chat_entity_references (*),
          chat_message_reads (
            user_id,
            read_at
          )
        `)
        .eq('conversation_id', id)
        .order('created_at', { ascending: false });

      if (data) {
        setMessages(data as ChatMessage[]);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages(true);
    markAsRead();

    // Subscribe to realtime messages & read receipts
    const channel = supabase
      .channel(`chat_messages_${id}`, {
        config: {
          broadcast: { ack: true, self: false },
        },
      })
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload: any) => {
          if (payload?.payload) {
            const incoming = payload.payload as ChatMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });
            markAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${id}` },
        async (payload) => {
          // Fetch full message with attachments, reply_to & read receipts
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:sender_id (
                id,
                full_name,
                email,
                department
              ),
              reply_to:reply_to_id (
                id,
                text_content,
                message_type,
                sender:sender_id (
                  id,
                  full_name,
                  email
                )
              ),
              chat_attachments (*),
              chat_entity_references (*),
              chat_message_reads (
                user_id,
                read_at
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some(m => m.id === data.id)) return prev;
              return [data as ChatMessage, ...prev];
            });
            markAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${id}` },
        () => {
          fetchMessages(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_message_reads' },
        () => {
          // When someone reads a message, refresh read receipts live
          fetchMessages(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_conversations', filter: `id=eq.${id}` },
        () => {
          // Sync pinned message, group name, avatar & topic in real time
          fetchConversation();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Heartbeat poll every 4 seconds to guarantee zero missed messages on mobile networks
    const pollInterval = setInterval(() => {
      fetchMessages(false);
    }, 4000);

    return () => {
      channelRef.current = null;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [id, fetchMessages, markAsRead]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages(false);
    fetchConversation();
    markAsRead();
  }, [fetchMessages, markAsRead]);

  const handleTextChange = async (val: string) => {
    setText(val);

    // Check for @mention
    const mentionMatch = val.match(/@([\w.]*)$/);
    setMentionQuery(mentionMatch ? mentionMatch[1] : null);

    // Check for #order
    const orderMatch = val.match(/#([\w-]*)$/);
    if (orderMatch) {
      const q = orderMatch[1];
      setOrderQuery(q);
      setLoadingOrders(true);
      try {
        const { data } = await supabase.rpc('search_chat_orders', { p_query: q });
        if (data && Array.isArray(data)) {
          setOrderSuggestions(data);
        } else {
          setOrderSuggestions([]);
        }
      } catch (e) {
        console.warn('Order search error:', e);
      } finally {
        setLoadingOrders(false);
      }
    } else {
      setOrderQuery(null);
      setOrderSuggestions([]);
    }
  };

  const insertMention = (staffUser: any) => {
    const name = staffUser.full_name?.replace(/\s+/g, '') || staffUser.email?.split('@')[0] || 'staff';
    const newText = text.replace(/@[\w.]*$/, `@${name} `);
    setText(newText);
    if (!staffUser.id.startsWith('dept_')) {
      setPendingMentions((prev) => (prev.includes(staffUser.id) ? prev : [...prev, staffUser.id]));
    }
    setMentionQuery(null);
  };

  const insertOrder = (ord: any) => {
    const orderNum = ord.order_number || ord.id;
    const newText = text.replace(/#[\w-]*$/, `#${orderNum} `);
    setText(newText);
    setPendingEntityRefs((prev) => [
      ...prev.filter(r => r.entity_id !== orderNum),
      {
        entity_type: 'order',
        entity_id: orderNum,
        display_label: `Order #${orderNum}`,
      }
    ]);
    setOrderQuery(null);
    setOrderSuggestions([]);
  };

  const handleOrderPress = async (orderNumOrId: string) => {
    const cleanId = orderNumOrId.replace(/^#/, '').trim();
    setShowOrderDetailsModal(true);
    setOrderDetailsLoading(true);
    setSelectedOrder(null);
    try {
      const { data, error } = await supabase.rpc('get_chat_order_details', { p_order_id_or_number: cleanId });
      if (data && !data.error) {
        setSelectedOrder(data);
      } else {
        setSelectedOrder({ order_number: cleanId, not_found: true });
      }
    } catch (e: any) {
      setSelectedOrder({ order_number: cleanId, error: e.message });
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleMentionPress = async (mentionText: string) => {
    const clean = mentionText.replace(/^@/, '').trim().toLowerCase();
    const deptList = ['all', 'operations', 'tech', 'support', 'marketing', 'management', 'orders'];
    if (deptList.includes(clean)) {
      setSelectedDept(clean);
      setShowDeptModal(true);
    } else {
      const matched = staffList.find((s) => {
        const name = (s.full_name || s.email || '').replace(/\s+/g, '').toLowerCase();
        const emailPrefix = (s.email || '').split('@')[0].toLowerCase();
        return name.includes(clean) || emailPrefix.includes(clean);
      });
      if (matched) {
        setSelectedStaffUser(matched);
        setShowStaffProfileModal(true);
      } else {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, email, role, department, phone_number')
          .ilike('full_name', `%${clean}%`)
          .limit(1)
          .maybeSingle();
        if (data) {
          setSelectedStaffUser(data);
          setShowStaffProfileModal(true);
        } else {
          Alert.alert('Mention', `@${mentionText.replace(/^@/, '')}`);
        }
      }
    }
  };

  const startDirectMessage = async (targetUser: any) => {
    setShowStaffProfileModal(false);
    setShowDeptModal(false);
    let uid = currentUserId || getCurrentUserId();
    if (!uid) uid = await AsyncStorage.getItem('ruhvi_user_id');
    if (!uid) return;

    try {
      const { data: convId, error } = await supabase.rpc('get_or_create_direct_conversation', {
        p_user_a: uid,
        p_user_b: targetUser.id,
      });
      if (convId) {
        navigation.push('ChatRoom', { id: convId, isGroup: false });
      } else if (error) {
        Alert.alert('Error', error.message || 'Could not start chat');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAddEntityRef = () => {
    if (!entityId.trim()) return;
    const prefixMap = { order: 'Order', support_ticket: 'Ticket', product: 'Product' };
    const newRef = {
      entity_type: entityType,
      entity_id: entityId.trim(),
      display_label: `${prefixMap[entityType]} #${entityId.trim()}`,
    };
    setPendingEntityRefs((prev) => [...prev, newRef]);
    setEntityId('');
    setShowEntityModal(false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if ((!trimmed && pendingEntityRefs.length === 0) || sending) return;

    let uid = currentUserId || getCurrentUserId();
    if (!uid) {
      uid = await AsyncStorage.getItem('ruhvi_user_id');
    }
    if (!uid) {
      Alert.alert('Session Error', 'User ID not found. Please log in again.');
      return;
    }

    setSending(true);
    const replyTargetId = replyingTo ? replyingTo.id : null;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: id,
          sender_id: uid,
          message_type: 'text',
          text_content: trimmed || (pendingEntityRefs.length > 0 ? pendingEntityRefs[0].display_label : ''),
          reply_to_id: replyTargetId,
        })
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            email
          ),
          reply_to:reply_to_id (
            id,
            text_content,
            message_type,
            sender:sender_id (
              id,
              full_name,
              email
            )
          ),
          chat_attachments (*)
        `)
        .single();

      if (error) {
        Alert.alert('Error', error.message || 'Could not send message');
      } else if (data) {
        // Save pending entity references
        if (pendingEntityRefs.length > 0) {
          const refRows = pendingEntityRefs.map((r) => ({
            message_id: data.id,
            entity_type: r.entity_type,
            entity_id: r.entity_id,
            display_label: r.display_label || null,
          }));
          await supabase.from('chat_entity_references').insert(refRows);
          (data as any).chat_entity_references = refRows;
        }

        // Save pending mentions
        if (pendingMentions.length > 0) {
          const mentionRows = pendingMentions.map((mid) => ({
            message_id: data.id,
            mentioned_user_id: mid,
          }));
          await supabase.from('chat_message_mentions').insert(mentionRows);
        }

        setText('');
        setReplyingTo(null);
        setPendingEntityRefs([]);
        setPendingMentions([]);
        setMessages((prev) => [data as ChatMessage, ...prev.filter((m) => m.id !== data.id)]);

        // 1. Instant broadcast to room channel (<50ms peer-to-peer delivery)
        try {
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'new_message',
              payload: data,
            });
          }
        } catch (_) {}

        // 2. Broadcast to global feed channel for real-time list previews
        try {
          const globalChan = supabase.channel('chat_list_global_feed');
          globalChan.send({
            type: 'broadcast',
            event: 'feed_update',
            payload: {
              conversation_id: id,
              sender_id: uid,
              sender_name: data.sender?.full_name || 'Staff Member',
              text_content: trimmed,
            },
          });
        } catch (_) {}

        // 3. Dispatch free push notification to recipients' mobile devices
        dispatchChatPushNotification(
          id,
          uid,
          data.sender?.full_name || 'Staff Member',
          trimmed
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Upload an image or file to Cloudinary & insert message
  const handleUploadAndSend = async (
    uri: string,
    fileName: string,
    mimeType: string,
    fileSize?: number
  ) => {
    setShowAttachMenu(false);

    let uid = currentUserId || getCurrentUserId();
    if (!uid) {
      uid = await AsyncStorage.getItem('ruhvi_user_id');
    }
    if (!uid) {
      Alert.alert('Session Error', 'User ID not found.');
      return;
    }

    const tempId = 'temp_' + Date.now();
    const isImage = mimeType.startsWith('image/');

    // Optimistic message shown instantly in chat bubble
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversation_id: id,
      sender_id: uid,
      message_type: 'attachment',
      text_content: fileName,
      reply_to_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      is_edited: false,
      system_action: null,
      uploading: true,
      chat_attachments: [
        {
          id: 'temp_att_' + Date.now(),
          message_id: tempId,
          cloudinary_public_id: '',
          cloudinary_url: uri, // Use local URI or data URI for instant preview!
          resource_type: isImage ? 'image' : 'raw',
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize || null,
          width: null,
          height: null,
          duration: null,
          created_at: new Date().toISOString(),
        } as any,
      ],
      chat_message_reads: [],
    };

    setMessages((prev) => [optimisticMessage, ...prev]);

    try {
      // 1. Upload to Cloudinary
      const uploaded = await uploadToCloudinary(uri, fileName, mimeType, fileSize);

      // 2. Insert message row
      const { data: msgData, error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: id,
          sender_id: uid,
          message_type: 'attachment',
          text_content: fileName,
        })
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            email
          )
        `)
        .single();

      if (msgError || !msgData) {
        throw new Error(msgError?.message || 'Failed to create attachment message');
      }

      // 3. Insert attachment row
      const { data: attachData, error: attachError } = await supabase
        .from('chat_attachments')
        .insert({
          message_id: msgData.id,
          cloudinary_public_id: uploaded.cloudinary_public_id,
          cloudinary_url: uploaded.cloudinary_url,
          resource_type: uploaded.resource_type,
          file_name: uploaded.file_name,
          mime_type: uploaded.mime_type,
          file_size: uploaded.file_size,
          width: uploaded.width,
          height: uploaded.height,
        })
        .select()
        .single();

      if (attachError) {
        console.error('Attachment metadata insert error:', attachError);
      }

      // Replace optimistic message with confirmed server message
      const completeMessage: ChatMessage = {
        ...msgData,
        uploading: false,
        chat_attachments: attachData ? [attachData as any] : [],
        chat_message_reads: [],
      };

      setMessages((prev) => [completeMessage, ...prev.filter(m => m.id !== tempId && m.id !== completeMessage.id)]);

      // 1. Instant broadcast to room channel
      try {
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: completeMessage,
          });
        }
      } catch (_) {}

      // 2. Broadcast to global feed channel
      try {
        const globalChan = supabase.channel('chat_list_global_feed');
        globalChan.send({
          type: 'broadcast',
          event: 'feed_update',
          payload: {
            conversation_id: id,
            sender_id: uid,
            sender_name: completeMessage.sender?.full_name || 'Staff Member',
            text_content: '📎 Sent an attachment',
          },
        });
      } catch (_) {}

      // 3. Dispatch free push notification for attachment
      dispatchChatPushNotification(
        id,
        uid,
        completeMessage.sender?.full_name || 'Staff Member',
        '📎 Sent an attachment'
      );
    } catch (err: any) {
      console.error('Upload error:', err);
      // Remove temporary optimistic message on failure
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      Alert.alert('Upload Failed', err.message || 'Could not upload media');
    }
  };

  // Pick Image from Gallery / Screenshots
  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `IMG_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        const filePayload = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;
        await handleUploadAndSend(filePayload, fileName, mimeType, asset.fileSize);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick image');
    }
  };

  // Capture Photo using Camera
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = `PHOTO_${Date.now()}.jpg`;
        const mimeType = 'image/jpeg';
        const filePayload = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;
        await handleUploadAndSend(filePayload, fileName, mimeType, asset.fileSize);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not launch camera');
    }
  };

  // Pick Document / File (PDF, DOCX, TXT, etc.)
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        const fileName = doc.name || `DOC_${Date.now()}`;
        let mimeType = doc.mimeType || 'application/octet-stream';
        if (fileName.toLowerCase().endsWith('.pdf')) {
          mimeType = 'application/pdf';
        }

        // Pass doc.uri directly to handleUploadAndSend
        await handleUploadAndSend(doc.uri, fileName, mimeType, doc.size);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick document');
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === currentUserId;
    const time = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const attachments = (item as any).chat_attachments || item.attachments || [];
    const firstAttach: any = attachments.length > 0 ? attachments[0] : null;

    const senderName = isGroup && !isMe
      ? (item.sender?.department
          ? `${item.sender?.full_name || item.sender?.email || 'Staff Member'} (${item.sender.department})`
          : (item.sender?.full_name || item.sender?.email || 'Staff Member'))
      : null;

    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.otherWrapper]}>
        <TouchableOpacity 
          activeOpacity={0.92}
          onLongPress={() => setActionMenuMessage(item)}
          style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}
        >
          {/* Group sender name */}
          {senderName && (
            <Text style={styles.senderHeader}>{senderName}</Text>
          )}

          {/* Quoted Reply Message Preview */}
          {item.reply_to && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                const idx = filteredMessages.findIndex(m => m.id === item.reply_to?.id);
                if (idx >= 0 && flatListRef.current) {
                  flatListRef.current.scrollToIndex({ index: idx, animated: true });
                }
              }}
              style={[
                styles.quotedBubblePreview,
                isMe ? styles.quotedBubblePreviewMe : styles.quotedBubblePreviewThem
              ]}
            >
              <View style={[styles.quotedAccentBar, isMe ? { backgroundColor: '#128C7E' } : { backgroundColor: '#075E54' }]} />
              <View style={styles.quotedTextContainer}>
                <Text style={styles.quotedSenderName} numberOfLines={1}>
                  {item.reply_to.sender?.full_name || item.reply_to.sender?.email || 'Staff'}
                </Text>
                <Text style={styles.quotedContentText} numberOfLines={2}>
                  {item.reply_to.text_content || (item.reply_to.message_type === 'attachment' ? '📎 Attachment' : 'Message')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Attachment Render */}
          {firstAttach && (
            firstAttach.resource_type === 'image' ? (
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => !item.uploading && setPreviewImageUrl(firstAttach.cloudinary_url)}
                style={styles.imageWrapper}
              >
                <Image 
                  source={{ uri: firstAttach.cloudinary_url }} 
                  style={styles.attachmentImage} 
                  resizeMode="cover"
                />
                {/* WhatsApp-style centered circular loading spinner while uploading */}
                {item.uploading && (
                  <View style={styles.inBubbleLoaderOverlay}>
                    <View style={styles.inBubbleLoaderCircle}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.docCard}
                activeOpacity={0.7}
                onPress={() => !item.uploading && Linking.openURL(firstAttach.cloudinary_url)}
              >
                <MaterialIcons name="insert-drive-file" size={32} color="#128C7E" />
                <View style={styles.docDetails}>
                  <Text style={styles.docName} numberOfLines={1}>{firstAttach.file_name}</Text>
                  <Text style={styles.docSize}>
                    {firstAttach.file_size ? `${(firstAttach.file_size / 1024).toFixed(1)} KB` : 'Document'}
                  </Text>
                </View>
                {item.uploading ? (
                  <ActivityIndicator size="small" color="#128C7E" style={{ marginRight: 4 }} />
                ) : (
                  <MaterialIcons name="file-download" size={20} color="#666" />
                )}
              </TouchableOpacity>
            )
          )}

          {/* Text content if text message or caption with clickable links/phone/email/mentions/orders */}
          {(!firstAttach || (item.text_content && item.text_content !== firstAttach.file_name)) && (
            <AutoLinkText 
              text={item.text_content || ''} 
              style={styles.messageText} 
              isMe={isMe} 
              onPressMention={handleMentionPress}
              onPressOrder={handleOrderPress}
            />
          )}

          {/* Attached Entity References (#Order, #Ticket, #Product) */}
          {Array.isArray((item as any).chat_entity_references) && (item as any).chat_entity_references.length > 0 && (
            <View style={styles.entityRefsContainer}>
              {(item as any).chat_entity_references.map((ref: any, idx: number) => {
                const iconName = ref.entity_type === 'order' ? 'shopping-bag' : ref.entity_type === 'support_ticket' ? 'confirmation-number' : 'inventory-2';
                const typeLabel = ref.entity_type === 'order' ? 'Order' : ref.entity_type === 'support_ticket' ? 'Ticket' : 'Product';
                return (
                  <TouchableOpacity 
                    key={idx} 
                    activeOpacity={0.7}
                    onPress={() => {
                      if (ref.entity_type === 'order') {
                        handleOrderPress(ref.entity_id);
                      }
                    }}
                    style={[styles.entityBadge, isMe ? styles.entityBadgeMe : styles.entityBadgeThem]}
                  >
                    <MaterialIcons name={iconName} size={12} color={isMe ? '#075E54' : '#128C7E'} style={{ marginRight: 3 }} />
                    <Text style={[styles.entityBadgeText, isMe ? styles.entityBadgeTextMe : styles.entityBadgeTextThem]}>
                      #{typeLabel} {ref.entity_id}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Timestamp & Ticks row */}
          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{time}</Text>
            {isMe && (
              item.uploading ? (
                <MaterialIcons name="schedule" size={13} color="#888" style={styles.checkIcon} />
              ) : (
                (() => {
                  const reads = (item as any).chat_message_reads || [];
                  const seenByOthers = reads.some((r: any) => r.user_id !== currentUserId);
                  return (
                    <MaterialIcons 
                      name={seenByOthers ? "done-all" : "done"} 
                      size={seenByOthers ? 15 : 14} 
                      color={seenByOthers ? "#34B7F1" : "#888"} 
                      style={styles.checkIcon} 
                    />
                  );
                })()
              )
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const filteredMessages = inChatSearchQuery.trim()
    ? messages.filter(m => (m.text_content || '').toLowerCase().includes(inChatSearchQuery.trim().toLowerCase()))
    : messages;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      {/* WhatsApp In-Chat Search Bar */}
      {isSearchingInChat && (
        <View style={styles.inChatSearchBar}>
          <MaterialIcons name="search" size={20} color="#075E54" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.inChatSearchInput}
            placeholder="Search in this chat..."
            placeholderTextColor="#888"
            value={inChatSearchQuery}
            onChangeText={setInChatSearchQuery}
            autoFocus
          />
          {inChatSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setInChatSearchQuery('')} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={18} color="#666" />
            </TouchableOpacity>
          )}
          {inChatSearchQuery.trim().length > 0 && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{filteredMessages.length} found</Text>
            </View>
          )}
        </View>
      )}

      {/* Resolved / Archived Notice Banner */}
      {conversation?.archived_at && (
        <View style={styles.archivedBanner}>
          <MaterialIcons name="check-circle" size={18} color="#2e7d32" style={{ marginRight: 6 }} />
          <Text style={styles.archivedBannerText}>Issue resolved • Conversation archived</Text>
          <TouchableOpacity onPress={handleUnarchiveChat} style={styles.reopenBtn}>
            <Text style={styles.reopenBtnText}>Reopen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WhatsApp-Style Pinned Message Banner */}
      {pinnedMessage && (
        <View style={styles.pinnedBanner}>
          <TouchableOpacity
            style={styles.pinnedBannerContent}
            activeOpacity={0.8}
            onPress={() => {
              const idx = filteredMessages.findIndex(m => m.id === (pinnedMessage.id || conversation?.pinned_message_id));
              if (idx >= 0 && flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
              } else {
                Alert.alert('Pinned Message', pinnedMessage.text_content || 'Pinned Attachment');
              }
            }}
          >
            <View style={styles.pinnedIconCircle}>
              <MaterialIcons name="push-pin" size={16} color="#075E54" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={styles.pinnedTitle} numberOfLines={1}>
                📌 Pinned: {pinnedMessage.sender?.full_name || pinnedMessage.sender?.email || 'Message'}
              </Text>
              <Text style={styles.pinnedSnippet} numberOfLines={1}>
                {pinnedMessage.text_content || (pinnedMessage.message_type === 'attachment' ? '📎 Attachment' : 'Pinned message')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleUnpinMessage}
            style={styles.pinnedCloseBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#128C7E" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          inverted
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#128C7E']}
            />
          }
          ListEmptyComponent={
            inChatSearchQuery.trim().length > 0 ? (
              <View style={styles.emptySearchContainer}>
                <MaterialIcons name="search-off" size={48} color="#aaa" />
                <Text style={styles.emptySearchText}>
                  No messages found matching "{inChatSearchQuery}"
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Broadcast Read-Only Banner OR WhatsApp Input Bar */}
      {conversation?.type === 'broadcast' && !conversation?.allow_replies && !['super_admin', 'admin'].includes(userRole) ? (
        <View style={styles.broadcastReadOnlyBanner}>
          <MaterialIcons name="campaign" size={22} color="#E65100" style={{ marginRight: 8 }} />
          <Text style={styles.broadcastReadOnlyText}>
            Only Administrators can post in this broadcast channel.
          </Text>
        </View>
      ) : (
        <View>
          {/* Order Suggestions Overlay (#) */}
          {orderQuery !== null && (
            <View style={styles.orderOverlay}>
              <View style={styles.orderOverlayHeaderRow}>
                <Text style={styles.mentionHeader}>Recent & Matching Orders</Text>
                {loadingOrders && <ActivityIndicator size="small" color="#128C7E" />}
              </View>
              <ScrollView horizontal={false} style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                {orderSuggestions.length === 0 && !loadingOrders ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={styles.noOrdersText}>No orders matching "#{orderQuery}"</Text>
                  </View>
                ) : (
                  orderSuggestions.map((ord: any) => (
                    <TouchableOpacity 
                      key={ord.id}
                      style={styles.orderRow}
                      onPress={() => insertOrder(ord)}
                    >
                      <View style={styles.orderIconBox}>
                        <MaterialIcons name="shopping-bag" size={16} color="#128C7E" />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.orderNumberText}>#{ord.order_number}</Text>
                          <View style={[styles.orderStatusBadge, { backgroundColor: ord.status === 'delivered' ? '#E8F5E9' : '#FFF3E0' }]}>
                            <Text style={[styles.orderStatusText, { color: ord.status === 'delivered' ? '#2E7D32' : '#E65100' }]}>
                              {ord.status || 'processing'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.orderCustomerText} numberOfLines={1}>
                          {ord.customer_name || 'Customer'}
                        </Text>
                      </View>
                      <Text style={styles.orderAmountText}>₹{ord.total_amount?.toLocaleString?.('en-IN') || ord.total_amount}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Mention Suggestions Overlay (@) */}
          {mentionQuery !== null && (
            <View style={styles.mentionOverlay}>
              <Text style={styles.mentionHeader}>Mention Staff or Department</Text>
              <ScrollView horizontal={false} style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                {/* Department presets */}
                {['All', 'Operations', 'Tech', 'Support', 'Orders', 'Marketing', 'Management']
                  .filter(dept => dept.toLowerCase().includes((mentionQuery || '').toLowerCase()))
                  .map(dept => (
                    <TouchableOpacity 
                      key={`dept-${dept}`}
                      style={styles.mentionRow}
                      onPress={() => insertMention({ id: 'dept_' + dept.toLowerCase(), full_name: dept })}
                    >
                      <View style={[styles.mentionAvatar, { backgroundColor: '#128C7E' }]}>
                        <MaterialIcons name="group" size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mentionNameText}>@{dept}</Text>
                        <Text style={styles.mentionRoleText}>Department Broadcast</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                {/* Individual staff */}
                {staffList
                  .filter(s => ((s.full_name || s.email || '') as string).toLowerCase().includes((mentionQuery || '').toLowerCase()))
                  .map(staff => (
                    <TouchableOpacity 
                      key={staff.id}
                      style={styles.mentionRow}
                      onPress={() => insertMention(staff)}
                    >
                      <View style={styles.mentionAvatar}>
                        <Text style={styles.mentionAvatarText}>
                          {(staff.full_name || staff.email)[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mentionNameText}>
                          {staff.department ? `${staff.full_name || staff.email} (${staff.department})` : (staff.full_name || staff.email)}
                        </Text>
                        <Text style={styles.mentionRoleText}>{staff.role || 'Staff'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}

          {/* WhatsApp-Style Quoted Reply Bar */}
          {replyingTo && (
            <View style={styles.replyPreviewBar}>
              <View style={styles.replyBarAccent} />
              <View style={styles.replyBarContent}>
                <Text style={styles.replyBarSender} numberOfLines={1}>
                  Replying to {replyingTo.sender?.full_name || replyingTo.sender?.email || 'Staff'}
                </Text>
                <Text style={styles.replyBarText} numberOfLines={1}>
                  {replyingTo.text_content || (replyingTo.message_type === 'attachment' ? '📎 Attachment' : 'Message')}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setReplyingTo(null)}
                style={styles.replyBarCloseBtn}
              >
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Pending Attached Entity References Bar */}
          {pendingEntityRefs.length > 0 && (
            <View style={styles.pendingRefsBar}>
              {pendingEntityRefs.map((ref, idx) => (
                <View key={idx} style={styles.pendingRefChip}>
                  <MaterialIcons 
                    name={ref.entity_type === 'order' ? 'shopping-bag' : ref.entity_type === 'support_ticket' ? 'confirmation-number' : 'inventory-2'} 
                    size={14} 
                    color="#075E54" 
                    style={{ marginRight: 4 }} 
                  />
                  <Text style={styles.pendingRefChipText}>
                    #{ref.entity_type === 'order' ? 'Order' : ref.entity_type === 'support_ticket' ? 'Ticket' : 'Product'} {ref.entity_id}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setPendingEntityRefs(prev => prev.filter((_, i) => i !== idx))}
                    style={{ marginLeft: 4 }}
                  >
                    <MaterialIcons name="close" size={14} color="#888" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={handleTextChange}
                placeholder="Type a message... (@ for staff, # for orders)"
                placeholderTextColor="#888"
                multiline
              />
              <TouchableOpacity 
                style={styles.iconInsideInput}
                onPress={() => setShowEntityModal(true)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#128C7E' }}>#</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconInsideInput}
                onPress={() => setShowAttachMenu(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="attach-file" size={22} color="#777" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconInsideInput}
                onPress={takePhoto}
                activeOpacity={0.7}
              >
                <MaterialIcons name="camera-alt" size={22} color="#777" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.sendButton, (!text.trim() && pendingEntityRefs.length === 0 || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={(!text.trim() && pendingEntityRefs.length === 0) || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Attachment Options Modal / Bottom Sheet */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={styles.attachSheet}>
            <Text style={styles.attachTitle}>Share Content</Text>
            <View style={styles.attachGrid}>
              <TouchableOpacity style={styles.attachItem} onPress={pickDocument}>
                <View style={[styles.attachCircle, { backgroundColor: '#5F66CD' }]}>
                  <MaterialIcons name="insert-drive-file" size={26} color="#fff" />
                </View>
                <Text style={styles.attachLabel}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachItem} onPress={takePhoto}>
                <View style={[styles.attachCircle, { backgroundColor: '#D3396D' }]}>
                  <MaterialIcons name="photo-camera" size={26} color="#fff" />
                </View>
                <Text style={styles.attachLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachItem} onPress={pickImage}>
                <View style={[styles.attachCircle, { backgroundColor: '#AC44CF' }]}>
                  <MaterialIcons name="image" size={26} color="#fff" />
                </View>
                <Text style={styles.attachLabel}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full-Screen Image Preview Modal */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity 
            style={styles.closePreviewBtn}
            onPress={() => setPreviewImageUrl(null)}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image 
              source={{ uri: previewImageUrl }} 
              style={styles.fullscreenImage} 
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Entity Reference Picker Modal (#Order, #Ticket, #Product) */}
      <Modal
        visible={showEntityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEntityModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEntityModal(false)}
        >
          <View style={styles.entityModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.entityModalTitle}>Attach Reference</Text>
            <Text style={styles.entityModalSubtitle}>Link an Order, Support Ticket, or Product to your message</Text>
            
            <View style={styles.entityTypeSelector}>
              {[
                { type: 'order' as const, label: 'Order', icon: 'shopping-bag' as const },
                { type: 'support_ticket' as const, label: 'Ticket', icon: 'confirmation-number' as const },
                { type: 'product' as const, label: 'Product', icon: 'inventory-2' as const },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.entityTypeTab, entityType === opt.type && styles.entityTypeTabActive]}
                  onPress={() => setEntityType(opt.type)}
                >
                  <MaterialIcons 
                    name={opt.icon} 
                    size={16} 
                    color={entityType === opt.type ? '#fff' : '#555'} 
                    style={{ marginRight: 4 }} 
                  />
                  <Text style={[styles.entityTypeTabText, entityType === opt.type && styles.entityTypeTabTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.entityInput}
              value={entityId}
              onChangeText={setEntityId}
              placeholder={
                entityType === 'order' ? 'e.g. RUH-2026-9876' :
                entityType === 'support_ticket' ? 'e.g. TKT-1042' : 'e.g. PRD-901'
              }
              placeholderTextColor="#888"
              autoFocus
            />

            <View style={styles.entityModalActions}>
              <TouchableOpacity 
                style={styles.entityCancelBtn}
                onPress={() => {
                  setShowEntityModal(false);
                  setEntityId('');
                }}
              >
                <Text style={styles.entityCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.entityConfirmBtn, !entityId.trim() && { opacity: 0.5 }]}
                onPress={handleAddEntityRef}
                disabled={!entityId.trim()}
              >
                <Text style={styles.entityConfirmBtnText}>Attach</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Order Details Modal (#RUH-...) */}
      <Modal
        visible={showOrderDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrderDetailsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOrderDetailsModal(false)}
        >
          <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <MaterialIcons name="shopping-bag" size={24} color="#128C7E" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.sheetTitle}>
                    {selectedOrder?.order_number ? `#${selectedOrder.order_number}` : 'Order Details'}
                  </Text>
                  <Text style={styles.sheetSubtitle}>Staff Order Inspector</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowOrderDetailsModal(false)} style={styles.sheetCloseBtn}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {orderDetailsLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#128C7E" />
                <Text style={{ marginTop: 12, color: '#666', fontSize: 13 }}>Loading order information...</Text>
              </View>
            ) : selectedOrder?.not_found ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <MaterialIcons name="error-outline" size={40} color="#E53E3E" />
                <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '700', color: '#2D3748' }}>Order Not Found</Text>
                <Text style={{ marginTop: 4, color: '#718096', fontSize: 13, textAlign: 'center' }}>
                  No order record matched #{selectedOrder.order_number} in the database.
                </Text>
              </View>
            ) : selectedOrder ? (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Status & Total pill */}
                <View style={styles.orderSummaryCard}>
                  <View>
                    <Text style={styles.summaryLabel}>Total Amount</Text>
                    <Text style={styles.summaryAmount}>
                      ₹{selectedOrder.total_amount?.toLocaleString?.('en-IN') || selectedOrder.total_amount || 0}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, {
                    backgroundColor: selectedOrder.status === 'delivered' ? '#E8F5E9' : selectedOrder.status === 'shipped' ? '#E3F2FD' : '#FFF3E0'
                  }]}>
                    <Text style={[styles.statusPillText, {
                      color: selectedOrder.status === 'delivered' ? '#2E7D32' : selectedOrder.status === 'shipped' ? '#1565C0' : '#E65100'
                    }]}>
                      {(selectedOrder.status || 'processing').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Customer Details */}
                <View style={styles.sheetInfoSection}>
                  <Text style={styles.sectionHeaderTitle}>Customer Information</Text>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="person" size={18} color="#718096" />
                    <Text style={styles.infoText}>{selectedOrder.customer_name || 'Guest Customer'}</Text>
                  </View>
                  {selectedOrder.customer_email && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="email" size={18} color="#718096" />
                      <Text style={styles.infoText}>{selectedOrder.customer_email}</Text>
                    </View>
                  )}
                  {selectedOrder.customer_phone && (
                    <TouchableOpacity 
                      style={styles.infoRow}
                      onPress={() => Linking.openURL(`tel:${selectedOrder.customer_phone}`)}
                    >
                      <MaterialIcons name="phone" size={18} color="#128C7E" />
                      <Text style={[styles.infoText, { color: '#128C7E', fontWeight: '600' }]}>
                        {selectedOrder.customer_phone} (Tap to Call)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Payment & Shipping */}
                <View style={styles.sheetInfoSection}>
                  <Text style={styles.sectionHeaderTitle}>Payment & Logistics</Text>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="payment" size={18} color="#718096" />
                    <Text style={styles.infoText}>
                      Payment: {selectedOrder.payment_status ? selectedOrder.payment_status.toUpperCase() : 'PENDING'} 
                      {selectedOrder.payment_method ? ` (${selectedOrder.payment_method})` : ''}
                    </Text>
                  </View>
                  {selectedOrder.shipping_address && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="location-on" size={18} color="#718096" />
                      <Text style={styles.infoText} numberOfLines={3}>
                        {typeof selectedOrder.shipping_address === 'string' 
                          ? selectedOrder.shipping_address 
                          : `${selectedOrder.shipping_address.address_line_1 || ''}, ${selectedOrder.shipping_address.city || ''} ${selectedOrder.shipping_address.postal_code || ''}`}
                      </Text>
                    </View>
                  )}
                  {selectedOrder.created_at && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="access-time" size={18} color="#718096" />
                      <Text style={styles.infoText}>
                        Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Dashboard Action */}
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => {
                    setShowOrderDetailsModal(false);
                    Linking.openURL(`https://ruhvi.in/admin/orders?q=${selectedOrder.order_number}`);
                  }}
                >
                  <MaterialIcons name="open-in-new" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionButtonText}>Open Order in Dashboard</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Staff User Profile Modal (@User) */}
      <Modal
        visible={showStaffProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStaffProfileModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStaffProfileModal(false)}
        >
          <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.profileAvatarLarge}>
                  <Text style={styles.profileAvatarLargeText}>
                    {((selectedStaffUser?.full_name || selectedStaffUser?.email || '?')[0]).toUpperCase()}
                  </Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sheetTitle}>
                    {selectedStaffUser?.full_name || selectedStaffUser?.email?.split('@')[0] || 'Staff Member'}
                  </Text>
                  <Text style={styles.sheetSubtitle}>{selectedStaffUser?.email}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowStaffProfileModal(false)} style={styles.sheetCloseBtn}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>
                    {(selectedStaffUser?.role || 'staff').replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                {selectedStaffUser?.department && (
                  <View style={[styles.roleChip, { backgroundColor: '#E0F2F1' }]}>
                    <Text style={[styles.roleChipText, { color: '#004D40' }]}>
                      {selectedStaffUser.department.toUpperCase()} DEPT
                    </Text>
                  </View>
                )}
              </View>

              {selectedStaffUser?.phone_number && (
                <View style={[styles.infoRow, { marginBottom: 12 }]}>
                  <MaterialIcons name="phone" size={18} color="#128C7E" />
                  <Text style={styles.infoText}>{selectedStaffUser.phone_number}</Text>
                </View>
              )}

              {selectedStaffUser?.id !== currentUserId && (
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => startDirectMessage(selectedStaffUser)}
                >
                  <MaterialIcons name="chat" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionButtonText}>Send Direct Message</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Department Broadcast & Details Modal (@Department) */}
      <Modal
        visible={showDeptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeptModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeptModal(false)}
        >
          <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.profileAvatarLarge, { backgroundColor: '#128C7E' }]}>
                  <MaterialIcons name="corporate-fare" size={24} color="#fff" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sheetTitle}>
                    @{selectedDept ? selectedDept.toUpperCase() : 'DEPARTMENT'}
                  </Text>
                  <Text style={styles.sheetSubtitle}>Internal Department Channel</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowDeptModal(false)} style={styles.sheetCloseBtn}>
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12 }}>
              <Text style={styles.sectionHeaderTitle}>Department Members</Text>
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                {staffList
                  .filter(s => selectedDept === 'all' || (s.department && s.department.toLowerCase() === selectedDept))
                  .length === 0 ? (
                    <Text style={{ color: '#888', fontStyle: 'italic', paddingVertical: 8 }}>
                      No members assigned to {selectedDept} yet.
                    </Text>
                  ) : (
                    staffList
                      .filter(s => selectedDept === 'all' || (s.department && s.department.toLowerCase() === selectedDept))
                      .map(member => (
                        <TouchableOpacity
                          key={member.id}
                          style={styles.deptMemberRow}
                          onPress={() => {
                            setShowDeptModal(false);
                            startDirectMessage(member);
                          }}
                        >
                          <View style={styles.mentionAvatar}>
                            <Text style={styles.mentionAvatarText}>
                              {(member.full_name || member.email)[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.mentionNameText}>{member.full_name || member.email}</Text>
                            <Text style={styles.mentionRoleText}>{member.role || 'Staff'}</Text>
                          </View>
                          <MaterialIcons name="chat-bubble-outline" size={18} color="#128C7E" />
                        </TouchableOpacity>
                      ))
                  )}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp-Style Message Quick Actions Sheet */}
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
                {actionMenuMessage?.text_content || 'Message Options'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                if (actionMenuMessage) {
                  setReplyingTo(actionMenuMessage);
                }
                setActionMenuMessage(null);
              }}
            >
              <MaterialIcons name="reply" size={22} color="#128C7E" style={{ marginRight: 12 }} />
              <Text style={styles.actionMenuItemText}>Reply to message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                if (actionMenuMessage) {
                  if (conversation?.pinned_message_id === actionMenuMessage.id) {
                    setActionMenuMessage(null);
                    handleUnpinMessage();
                  } else {
                    handlePinMessage(actionMenuMessage);
                  }
                }
              }}
            >
              <MaterialIcons name="push-pin" size={22} color="#075E54" style={{ marginRight: 12 }} />
              <Text style={styles.actionMenuItemText}>
                {conversation?.pinned_message_id === actionMenuMessage?.id ? 'Unpin message' : '📌 Pin message to top'}
              </Text>
            </TouchableOpacity>

            {actionMenuMessage?.sender_id !== currentUserId && actionMenuMessage?.sender && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => {
                  const targetSender = actionMenuMessage.sender;
                  setActionMenuMessage(null);
                  startDirectMessage(targetSender);
                }}
              >
                <MaterialIcons name="person" size={22} color="#128C7E" style={{ marginRight: 12 }} />
                <Text style={styles.actionMenuItemText}>Message sender directly</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionMenuItem, { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 4 }]}
              onPress={() => setActionMenuMessage(null)}
            >
              <MaterialIcons name="close" size={20} color="#888" style={{ marginRight: 12 }} />
              <Text style={[styles.actionMenuItemText, { color: '#888' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp-Style In-Chatroom Media & Docs Library Modal */}
      <Modal
        visible={showMediaLibrary}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMediaLibrary(false)}
      >
        <View style={styles.mediaModalOverlay}>
          <View style={styles.mediaModalContent}>
            {/* Header */}
            <View style={styles.mediaModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="perm-media" size={24} color="#075E54" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.mediaModalTitle}>Room Media Library</Text>
                  <Text style={styles.mediaModalSubtitle}>
                    {mediaLibraryItems.length} items shared in this chat
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowMediaLibrary(false)}
                style={styles.sheetCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.mediaTabSwitcher}>
              <TouchableOpacity
                style={[styles.mediaTabBtn, mediaTab === 'photos' && styles.mediaTabBtnActive]}
                onPress={() => setMediaTab('photos')}
              >
                <MaterialIcons
                  name="image"
                  size={18}
                  color={mediaTab === 'photos' ? '#fff' : '#555'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.mediaTabBtnText, mediaTab === 'photos' && styles.mediaTabBtnTextActive]}>
                  Photos ({mediaLibraryItems.filter(m => m.resource_type === 'image' || m.mime_type?.startsWith('image/')).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaTabBtn, mediaTab === 'docs' && styles.mediaTabBtnActive]}
                onPress={() => setMediaTab('docs')}
              >
                <MaterialIcons
                  name="insert-drive-file"
                  size={18}
                  color={mediaTab === 'docs' ? '#fff' : '#555'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.mediaTabBtnText, mediaTab === 'docs' && styles.mediaTabBtnTextActive]}>
                  Documents ({mediaLibraryItems.filter(m => m.resource_type !== 'image' && !m.mime_type?.startsWith('image/')).length})
                </Text>
              </TouchableOpacity>
            </View>

            {loadingMedia ? (
              <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#128C7E" />
                <Text style={{ marginTop: 10, color: '#666' }}>Loading media files...</Text>
              </View>
            ) : mediaTab === 'photos' ? (
              /* Photos Grid */
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {mediaLibraryItems.filter(m => m.resource_type === 'image' || m.mime_type?.startsWith('image/')).length === 0 ? (
                  <View style={styles.mediaEmptyBox}>
                    <MaterialIcons name="photo-size-select-actual" size={48} color="#CBD5E0" />
                    <Text style={styles.mediaEmptyText}>No photos or images sent in this chat yet.</Text>
                  </View>
                ) : (
                  <View style={styles.mediaGrid}>
                    {mediaLibraryItems
                      .filter(m => m.resource_type === 'image' || m.mime_type?.startsWith('image/'))
                      .map((item) => (
                        <View key={item.id} style={styles.mediaThumbCard}>
                          <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => setPreviewImageUrl(item.cloudinary_url)}
                          >
                            <Image
                              source={{ uri: item.cloudinary_url }}
                              style={styles.mediaThumbImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.mediaShowInChatSmallBtn}
                            onPress={() => handleShowInChat(item.message_id)}
                          >
                            <MaterialIcons name="chat-bubble-outline" size={13} color="#128C7E" />
                            <Text style={styles.mediaShowInChatSmallText}>Show in Chat</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                )}
              </ScrollView>
            ) : (
              /* Documents List */
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {mediaLibraryItems.filter(m => m.resource_type !== 'image' && !m.mime_type?.startsWith('image/')).length === 0 ? (
                  <View style={styles.mediaEmptyBox}>
                    <MaterialIcons name="folder-open" size={48} color="#CBD5E0" />
                    <Text style={styles.mediaEmptyText}>No documents or files sent in this chat yet.</Text>
                  </View>
                ) : (
                  mediaLibraryItems
                    .filter(m => m.resource_type !== 'image' && !m.mime_type?.startsWith('image/'))
                    .map((item) => {
                      const isPdf = item.file_name?.toLowerCase?.().endsWith('.pdf') || item.mime_type === 'application/pdf';
                      const sizeKb = item.file_size ? `${Math.round(item.file_size / 1024)} KB` : '';
                      return (
                        <View key={item.id} style={styles.mediaDocRow}>
                          <View style={[styles.mediaDocIconBox, { backgroundColor: isPdf ? '#FFEBEE' : '#E8EAF6' }]}>
                            <MaterialIcons
                              name={isPdf ? 'picture-as-pdf' : 'description'}
                              size={24}
                              color={isPdf ? '#D32F2F' : '#3F51B5'}
                            />
                          </View>
                          <View style={{ flex: 1, marginHorizontal: 10 }}>
                            <Text style={styles.mediaDocName} numberOfLines={1}>{item.file_name || 'Document'}</Text>
                            <Text style={styles.mediaDocMeta}>
                              {sizeKb ? `${sizeKb} • ` : ''}
                              {item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.mediaDocActionBtn}
                            onPress={() => handleShowInChat(item.message_id)}
                          >
                            <MaterialIcons name="search" size={16} color="#128C7E" />
                            <Text style={styles.mediaDocActionText}>Show</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.mediaDocActionBtn, { backgroundColor: '#F0FDF4', marginLeft: 6 }]}
                            onPress={() => Linking.openURL(item.cloudinary_url)}
                          >
                            <MaterialIcons name="file-download" size={16} color="#166534" />
                            <Text style={[styles.mediaDocActionText, { color: '#166534' }]}>Open</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* WhatsApp-Style Group Info & Customization Modal */}
      <Modal
        visible={showGroupInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupInfoModal(false)}
      >
        <View style={styles.mediaModalOverlay}>
          <View style={styles.mediaModalContent}>
            {/* Header */}
            <View style={styles.mediaModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="group" size={24} color="#075E54" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.mediaModalTitle}>Group Information</Text>
                  <Text style={styles.mediaModalSubtitle}>{groupMembers.length} participants</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowGroupInfoModal(false)}
                style={styles.sheetCloseBtn}
              >
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {/* Group Avatar with Camera Edit Badge */}
              <View style={styles.groupAvatarSection}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePickGroupAvatar}
                  style={styles.groupAvatarCircle}
                >
                  {groupAvatarUrl ? (
                    <Image source={{ uri: groupAvatarUrl }} style={styles.groupAvatarBigImage} />
                  ) : (
                    <View style={styles.groupAvatarBigPlaceholder}>
                      <MaterialIcons name="group" size={44} color="#fff" />
                    </View>
                  )}
                  <View style={styles.groupAvatarCameraBadge}>
                    {updatingGroup ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons name="camera-alt" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.groupAvatarChangeHint}>Tap avatar to change group icon</Text>
              </View>

              {/* Group Name & Topic Inputs */}
              <View style={styles.groupFormGroup}>
                <Text style={styles.groupFormLabel}>GROUP NAME / SUBJECT</Text>
                <TextInput
                  style={styles.groupFormInput}
                  value={editingGroupName}
                  onChangeText={setEditingGroupName}
                  placeholder="Enter group subject"
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.groupFormGroup}>
                <Text style={styles.groupFormLabel}>GROUP TOPIC / DESCRIPTION</Text>
                <TextInput
                  style={[styles.groupFormInput, { minHeight: 64, textAlignVertical: 'top' }]}
                  value={editingGroupTopic}
                  onChangeText={setEditingGroupTopic}
                  placeholder="What is this group about?"
                  placeholderTextColor="#888"
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryActionButton, { marginTop: 4, marginBottom: 20 }]}
                onPress={handleSaveGroupInfo}
                disabled={updatingGroup}
              >
                {updatingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionButtonText}>Save Group Details</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Participants List */}
              <Text style={styles.sectionHeaderTitle}>Group Participants ({groupMembers.length})</Text>
              {groupMembers.map((member) => (
                <View key={member.id} style={styles.groupParticipantRow}>
                  {member.avatar_url ? (
                    <Image source={{ uri: member.avatar_url }} style={styles.participantAvatarImage} />
                  ) : (
                    <View style={styles.participantAvatarPlaceholder}>
                      <Text style={styles.participantAvatarLetter}>
                        {(member.full_name || member.email || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.participantName} numberOfLines={1}>
                      {member.full_name || member.email?.split('@')[0] || 'Staff Member'}
                      {member.id === currentUserId ? ' (You)' : ''}
                    </Text>
                    <Text style={styles.participantRoleText}>
                      {member.department ? `${member.department.toUpperCase()} • ` : ''}
                      {member.member_role === 'admin' ? 'Group Admin' : 'Member'}
                    </Text>
                  </View>
                  {member.id !== currentUserId && (
                    <TouchableOpacity
                      style={styles.participantDmBtn}
                      onPress={() => {
                        setShowGroupInfoModal(false);
                        startDirectMessage(member);
                      }}
                    >
                      <MaterialIcons name="chat" size={18} color="#128C7E" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archivedBanner: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  archivedBannerText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  reopenBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
  },
  reopenBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inBubbleLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inBubbleLoaderCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  bubbleWrapper: {
    marginVertical: 3,
    flexDirection: 'row',
  },
  myWrapper: {
    justifyContent: 'flex-end',
  },
  otherWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 0,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 0,
  },
  senderHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#075E54',
    marginBottom: 4,
  },
  imageWrapper: {
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  attachmentImage: {
    width: 220,
    height: 220,
    borderRadius: 6,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
    minWidth: 180,
  },
  docDetails: {
    flex: 1,
    marginLeft: 8,
    marginRight: 6,
  },
  docName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#222',
  },
  docSize: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#111',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: '#888',
    marginRight: 4,
  },
  checkIcon: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    maxHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111',
    maxHeight: 100,
  },
  iconInsideInput: {
    padding: 6,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  attachSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  attachTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 20,
    textAlign: 'center',
  },
  attachGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachItem: {
    alignItems: 'center',
  },
  attachCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 3,
  },
  attachLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  broadcastReadOnlyBanner: {
    backgroundColor: '#FFFBEB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  broadcastReadOnlyText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Entity reference badges in messages
  entityRefsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
    marginBottom: 2,
  },
  entityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  entityBadgeMe: {
    backgroundColor: '#C8E6C9',
  },
  entityBadgeThem: {
    backgroundColor: '#E0F2F1',
  },
  entityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entityBadgeTextMe: {
    color: '#1B5E20',
  },
  entityBadgeTextThem: {
    color: '#004D40',
  },
  // Mention Suggestions Overlay
  mentionOverlay: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    maxHeight: 220,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  mentionHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#718096',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF2F7',
  },
  mentionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#319795',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mentionAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mentionNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A202C',
  },
  mentionRoleText: {
    fontSize: 11,
    color: '#718096',
    textTransform: 'capitalize',
  },
  // Pending refs bar above input
  pendingRefsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  pendingRefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  pendingRefChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E20',
  },
  // Entity Reference Picker Modal
  entityModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '88%',
    maxWidth: 380,
    alignSelf: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  entityModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  entityModalSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 16,
  },
  entityTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  entityTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    backgroundColor: '#F7FAFC',
  },
  entityTypeTabActive: {
    backgroundColor: '#128C7E',
    borderColor: '#128C7E',
  },
  entityTypeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  entityTypeTabTextActive: {
    color: '#FFFFFF',
  },
  entityInput: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A202C',
    backgroundColor: '#F8FAFC',
    marginBottom: 18,
  },
  entityModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  entityCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  entityCancelBtnText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  entityConfirmBtn: {
    backgroundColor: '#128C7E',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  entityConfirmBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // In-Chat Search Bar
  inChatSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inChatSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A202C',
    paddingVertical: 4,
  },
  matchBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  matchBadgeText: {
    fontSize: 11,
    color: '#1B5E20',
    fontWeight: '600',
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    transform: [{ scaleY: -1 }], // Inverted because FlatList is inverted
  },
  emptySearchText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  // Quoted Reply Preview inside Chat Bubble
  quotedBubblePreview: {
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
    borderLeftWidth: 4,
  },
  quotedBubblePreviewMe: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderLeftColor: '#128C7E',
  },
  quotedBubblePreviewThem: {
    backgroundColor: '#F0F4F4',
    borderLeftColor: '#075E54',
  },
  quotedAccentBar: {
    width: 0,
  },
  quotedTextContainer: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    flex: 1,
  },
  quotedSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#075E54',
    marginBottom: 2,
  },
  quotedContentText: {
    fontSize: 12,
    color: '#4A5568',
  },
  // Reply Bar above Input (WhatsApp Style)
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#128C7E',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 3,
  },
  replyBarAccent: {
    width: 0,
  },
  replyBarContent: {
    flex: 1,
    paddingRight: 8,
  },
  replyBarSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#128C7E',
    marginBottom: 2,
  },
  replyBarText: {
    fontSize: 12,
    color: '#4A5568',
  },
  replyBarCloseBtn: {
    padding: 6,
  },
  // Order Suggestions Overlay (#)
  orderOverlay: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    maxHeight: 220,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  orderOverlayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noOrdersText: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF2F7',
  },
  orderIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
    marginRight: 6,
  },
  orderStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderCustomerText: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  orderAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
  },
  // Common Bottom Sheet Styles for Order Details & Profile
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 12,
    marginBottom: 12,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 1,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  orderSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sheetInfoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#2D3748',
    marginLeft: 10,
    flex: 1,
  },
  primaryActionButton: {
    backgroundColor: '#128C7E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
    elevation: 2,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#319795',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarLargeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  roleChip: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5568',
  },
  deptMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF2F7',
  },
  // WhatsApp Action Menu Sheet
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
  // Pinned Message Banner
  pinnedBanner: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  pinnedBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
  },
  pinnedSnippet: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 1,
  },
  pinnedCloseBtn: {
    padding: 6,
  },
  // Media Library Modal
  mediaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  mediaModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '50%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mediaModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  mediaModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
  mediaModalSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 1,
  },
  mediaTabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginVertical: 12,
  },
  mediaTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  mediaTabBtnActive: {
    backgroundColor: '#075E54',
  },
  mediaTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  mediaTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mediaEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  mediaEmptyText: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 8,
    textAlign: 'center',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 6,
  },
  mediaThumbCard: {
    width: '31.3%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  mediaThumbImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#E2E8F0',
  },
  mediaShowInChatSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  mediaShowInChatSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#128C7E',
    marginLeft: 3,
  },
  mediaDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  mediaDocIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDocName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  mediaDocMeta: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
  },
  mediaDocActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mediaDocActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#128C7E',
    marginLeft: 2,
  },
  // Group Info Modal
  groupAvatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  groupAvatarCircle: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  groupAvatarBigImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  groupAvatarBigPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupAvatarChangeHint: {
    fontSize: 12,
    color: '#718096',
    marginTop: 6,
  },
  groupFormGroup: {
    marginBottom: 14,
  },
  groupFormLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  groupFormInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2D3748',
  },
  groupParticipantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF2F7',
  },
  participantAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  participantAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#319795',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  participantRoleText: {
    fontSize: 11,
    color: '#718096',
    marginTop: 1,
  },
  participantDmBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

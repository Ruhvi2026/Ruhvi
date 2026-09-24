import React, { useEffect, useState, useCallback } from 'react';
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

  // Mentions & Entity References State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [entityType, setEntityType] = useState<'order' | 'support_ticket' | 'product'>('order');
  const [entityId, setEntityId] = useState('');
  const [pendingEntityRefs, setPendingEntityRefs] = useState<any[]>([]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setIsSearchingInChat(prev => {
              if (prev) setInChatSearchQuery('');
              return !prev;
            });
          }}
          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
        >
          <MaterialIcons name={isSearchingInChat ? "close" : "search"} size={22} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSearchingInChat]);

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
        .select('id, type, group_name, archived_at, created_by, allow_replies')
        .eq('id', id)
        .single();
      if (data) {
        setConversation(data);
      }
    } catch (e) {
      console.warn('Error fetching conversation:', e);
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

  // Configure navigation header with Archive / Unarchive action
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={conversation?.archived_at ? handleUnarchiveChat : handleArchiveChat}
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name={conversation?.archived_at ? "unarchive" : "archive"} 
            size={23} 
            color="#fff" 
          />
        </TouchableOpacity>
      ),
    });
  }, [conversation, navigation, currentUserId]);

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
      .channel(`chat_messages_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${id}` },
        async (payload) => {
          // Fetch full message with attachments & read receipts
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
              chat_attachments (*),
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
        { event: 'INSERT', schema: 'public', table: 'chat_message_reads' },
        () => {
          // When someone reads a message, refresh read receipts live
          fetchMessages(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchMessages, markAsRead]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages(false);
    fetchConversation();
    markAsRead();
  }, [fetchMessages, markAsRead]);

  const handleTextChange = (val: string) => {
    setText(val);
    const match = val.match(/@([\w.]*)$/);
    setMentionQuery(match ? match[1] : null);
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
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: id,
          sender_id: uid,
          message_type: 'text',
          text_content: trimmed || (pendingEntityRefs.length > 0 ? pendingEntityRefs[0].display_label : ''),
        })
        .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            email
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
        setPendingEntityRefs([]);
        setPendingMentions([]);
        setMessages((prev) => [data as ChatMessage, ...prev.filter((m) => m.id !== data.id)]);
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
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {/* Group sender name */}
          {senderName && (
            <Text style={styles.senderHeader}>{senderName}</Text>
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

          {/* Text content if text message or caption with clickable links/phone/email */}
          {(!firstAttach || (item.text_content && item.text_content !== firstAttach.file_name)) && (
            <AutoLinkText text={item.text_content || ''} style={styles.messageText} isMe={isMe} />
          )}

          {/* Attached Entity References (#Order, #Ticket, #Product) */}
          {Array.isArray((item as any).chat_entity_references) && (item as any).chat_entity_references.length > 0 && (
            <View style={styles.entityRefsContainer}>
              {(item as any).chat_entity_references.map((ref: any, idx: number) => {
                const iconName = ref.entity_type === 'order' ? 'shopping-bag' : ref.entity_type === 'support_ticket' ? 'confirmation-number' : 'inventory-2';
                const typeLabel = ref.entity_type === 'order' ? 'Order' : ref.entity_type === 'support_ticket' ? 'Ticket' : 'Product';
                return (
                  <View key={idx} style={[styles.entityBadge, isMe ? styles.entityBadgeMe : styles.entityBadgeThem]}>
                    <MaterialIcons name={iconName} size={12} color={isMe ? '#075E54' : '#128C7E'} style={{ marginRight: 3 }} />
                    <Text style={[styles.entityBadgeText, isMe ? styles.entityBadgeTextMe : styles.entityBadgeTextThem]}>
                      #{typeLabel} {ref.entity_id}
                    </Text>
                  </View>
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
        </View>
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#128C7E" />
        </View>
      ) : (
        <FlatList
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
          {/* Mention Suggestions Overlay */}
          {mentionQuery !== null && (
            <View style={styles.mentionOverlay}>
              <Text style={styles.mentionHeader}>Mention Staff or Department</Text>
              <ScrollView horizontal={false} style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                {/* Department presets */}
                {['All', 'Operations', 'Tech', 'Support', 'Marketing', 'Management']
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
                placeholder="Type a message... (@ for staff, # for refs)"
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
              style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
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
});

import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  RefreshControl, 
  Alert,
  ScrollView,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase, getCurrentUserId, setSupabaseToken } from '../lib/supabase';
import { triggerLocalNotification } from '../lib/notifications';
import { uploadToCloudinary } from '../lib/cloudinary';

export default function ChatListScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<'active' | 'archived'>('active');

  // WhatsApp Global Search & Message Search state
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'broadcast' | 'groups'>('all');
  const [matchedMessages, setMatchedMessages] = useState<any[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);

  // Modal state for New Chat & Group Creation
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'contacts' | 'create_group'>('contacts');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Staff Profile Modal state
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchUserProfile = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role, department, avatar_url, bio')
        .eq('id', uid)
        .single();
      if (data) {
        setCurrentUserProfile(data);
        setEditFullName(data.full_name || '');
        setEditBio(data.bio || 'Hey there! I am using RuhChat.');
      }
    } catch (_) {}
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'RuhChat',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowProfileModal(true)}
          style={{ marginRight: 8, padding: 4 }}
          activeOpacity={0.8}
        >
          {currentUserProfile?.avatar_url ? (
            <Image
              source={{ uri: currentUserProfile.avatar_url }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarText}>
                {(currentUserProfile?.full_name || 'S').substring(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, currentUserProfile]);

  useEffect(() => {
    const init = async () => {
      let uid = getCurrentUserId();
      if (!uid) {
        uid = await AsyncStorage.getItem('ruhvi_user_id');
      }
      setCurrentUserIdState(uid);
      fetchChats(uid);
      if (uid) {
        fetchUserProfile(uid);
      }
    };
    init();

    // Subscribe to live realtime messages, broadcasts & notifications
    const channel = supabase
      .channel('chat_list_global_feed', {
        config: {
          broadcast: { ack: true, self: false },
        },
      })
      .on('broadcast', { event: 'feed_update' }, (payload: any) => {
        fetchChats();
        const activeUid = getCurrentUserId() || currentUserId;
        if (payload?.payload?.sender_id && payload.payload.sender_id !== activeUid) {
          triggerLocalNotification(
            payload.payload.sender_name || 'New Message',
            payload.payload.text_content || 'You received a new message'
          );
        }
      })
      .on('broadcast', { event: 'new_message' }, (payload: any) => {
        fetchChats();
        const activeUid = getCurrentUserId() || currentUserId;
        if (payload?.payload?.sender_id && payload.payload.sender_id !== activeUid) {
          triggerLocalNotification(
            payload.payload.sender_name || 'New Message',
            payload.payload.text_content || 'You received a new message'
          );
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          fetchChats();
          const activeUid = getCurrentUserId() || currentUserId;
          if (payload?.new && payload.new.sender_id !== activeUid) {
            triggerLocalNotification('New Message', payload.new.text_content || 'You received a new message');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => {
          fetchChats();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const activeUid = getCurrentUserId() || currentUserId;
          if (payload?.new && payload.new.user_id === activeUid) {
            fetchChats();
            triggerLocalNotification(payload.new.title || 'New Notification', payload.new.message || '');
          }
        }
      )
      .subscribe();

    // Background heartbeat poll (every 5 seconds) to ensure zero missed updates
    const pollInterval = setInterval(() => {
      fetchChats();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [currentUserId]);

  // Automatically refresh conversations whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [currentUserId])
  );

  const fetchChats = async (activeUid?: string | null) => {
    const uid = activeUid !== undefined ? activeUid : currentUserId;
    if (!uid) return;
    try {
      const { data, error } = await supabase.rpc('get_user_conversations_overview', {
        p_user_id: uid,
      });

      if (error) {
        console.error('get_user_conversations_overview error:', error);
      } else if (data) {
        setConversations(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching chats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats();
    if (currentUserId) fetchUserProfile(currentUserId);
  }, [currentUserId]);

  const handleGlobalSearchChange = (val: string) => {
    setGlobalSearch(val);
    if (!val.trim() || val.trim().length < 2) {
      setMatchedMessages([]);
      return;
    }
    searchMessages(val.trim());
  };

  const searchMessages = async (query: string) => {
    setSearchingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          conversation_id,
          text_content,
          created_at,
          sender:sender_id (
            id,
            full_name,
            email,
            department
          ),
          conversation:conversation_id (
            id,
            type,
            group_name,
            archived_at
          )
        `)
        .ilike('text_content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setMatchedMessages(data);
      }
    } catch (err) {
      console.error('Error searching messages:', err);
    } finally {
      setSearchingMessages(false);
    }
  };

  const openNewChatModal = async () => {
    setIsModalVisible(true);
    setModalMode('contacts');
    setSearchQuery('');
    setGroupName('');
    setSelectedMemberIds([]);
    setLoadingStaff(true);
    try {
      let uid = currentUserId || getCurrentUserId();
      if (!uid) {
        uid = await AsyncStorage.getItem('ruhvi_user_id');
        if (uid) setCurrentUserIdState(uid);
      }

      const { data, error } = await supabase.rpc('get_staff_directory');

      if (error) {
        console.error('Error fetching staff list via RPC:', error);
        Alert.alert('Error', error.message || 'Could not load staff list');
      } else if (data) {
        const filtered = uid ? data.filter((u: any) => u.id !== uid) : data;
        setStaffList(filtered);
      }
    } catch (err: any) {
      console.error('Error fetching staff list:', err);
      Alert.alert('Error', err.message || 'Error fetching staff list');
    } finally {
      setLoadingStaff(false);
    }
  };

  const startDirectChat = async (targetUser: any) => {
    if (creatingChat) return;
    setCreatingChat(true);

    try {
      let myUid = currentUserId || getCurrentUserId();
      if (!myUid) {
        myUid = await AsyncStorage.getItem('ruhvi_user_id');
      }

      if (!myUid) {
        Alert.alert('Session Error', 'User ID not found. Please log in again.');
        setCreatingChat(false);
        return;
      }

      const { data: convId, error: rpcError } = await supabase.rpc(
        'get_or_create_direct_conversation',
        { p_user_a: myUid, p_user_b: targetUser.id }
      );

      if (rpcError || !convId) {
        throw new Error(rpcError?.message || 'Failed to create conversation');
      }

      setIsModalVisible(false);
      fetchChats(myUid);
      const name = targetUser.department
        ? `${targetUser.full_name || targetUser.email || 'Direct Chat'} (${targetUser.department})`
        : (targetUser.full_name || targetUser.email || 'Direct Chat');
      navigation.navigate('ChatRoom', { id: convId, title: name });

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start conversation');
    } finally {
      setCreatingChat(false);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      Alert.alert('Group Name Required', 'Please enter a name for the group.');
      return;
    }

    if (selectedMemberIds.length === 0) {
      Alert.alert('Members Required', 'Please select at least 1 staff member for the group.');
      return;
    }

    setCreatingChat(true);
    try {
      let myUid = currentUserId || getCurrentUserId();
      if (!myUid) {
        myUid = await AsyncStorage.getItem('ruhvi_user_id');
      }

      if (!myUid) {
        Alert.alert('Session Error', 'User ID not found. Please log in again.');
        setCreatingChat(false);
        return;
      }

      const { data: convId, error } = await supabase.rpc('create_group_conversation', {
        p_creator_id: myUid,
        p_group_name: trimmed,
        p_member_ids: selectedMemberIds,
      });

      if (error || !convId) {
        throw new Error(error?.message || 'Failed to create group');
      }

      setIsModalVisible(false);
      fetchChats(myUid);
      navigation.navigate('ChatRoom', { id: convId, title: trimmed, isGroup: true });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create group');
    } finally {
      setCreatingChat(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Need gallery permissions to change photo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setUploadingAvatar(true);
        const asset = res.assets[0];
        const payload = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const uploaded = await uploadToCloudinary(payload, `avatar_${currentUserId}.jpg`, 'image/jpeg', asset.fileSize);
        const { data: updated } = await supabase.rpc('update_staff_profile', {
          p_user_id: currentUserId,
          p_avatar_url: uploaded.cloudinary_url,
        });
        if (updated) {
          setCurrentUserProfile(updated);
        }
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Error', 'Full name cannot be empty');
      return;
    }
    setSavingProfile(true);
    try {
      const { data: updated, error } = await supabase.rpc('update_staff_profile', {
        p_user_id: currentUserId,
        p_full_name: editFullName.trim(),
        p_bio: editBio.trim(),
      });
      if (error) throw error;
      if (updated) setCurrentUserProfile(updated);
      Alert.alert('Success', 'Profile updated successfully.');
      setShowProfileModal(false);
      fetchChats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of RuhChat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('ruhvi_user_id');
          await AsyncStorage.removeItem('ruhvi_auth_token');
          setSupabaseToken(null);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const getChatTitle = (item: any) => {
    if (item.type === 'broadcast') {
      return item.group_name || '📢 Official Staff Broadcast';
    }
    if (item.type === 'group') {
      return item.group_name || 'Group Discussion';
    }
    const members = item.members || item.chat_conversation_members || [];
    const other = members.find((m: any) => (m.user_id || m.id) !== currentUserId);
    if (other) {
      const name = other.full_name || other.users?.full_name || other.email || 'Staff Member';
      const dept = other.department || other.users?.department;
      return dept ? `${name} (${dept})` : name;
    }
    return 'Staff Chat';
  };

  const getChatAvatar = (item: any) => {
    if (item.type === 'group' && item.group_avatar_url) {
      return item.group_avatar_url;
    }
    if (item.type === 'direct') {
      const members = item.members || item.chat_conversation_members || [];
      const other = members.find((m: any) => (m.user_id || m.id) !== currentUserId);
      if (other?.avatar_url) return other.avatar_url;
    }
    return null;
  };

  const renderItem = ({ item }: { item: any }) => {
    const isBroadcast = item.type === 'broadcast';
    const isGroup = item.type === 'group';
    const chatTitle = isBroadcast ? (item.group_name || '📢 Official Broadcast') : getChatTitle(item);
    const avatarUrl = getChatAvatar(item);
    const avatarColor = isBroadcast ? '#E65100' : isGroup ? '#075E54' : '#' + (item.id.replace(/[^0-9a-f]/gi, '').substring(0, 6) || '128c7e');
    const date = new Date(item.latest_activity_at || item.updated_at || item.created_at);
    const isToday = new Date().toDateString() === date.toDateString();
    const timeString = isToday 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const unreadCount = item.unread_count || 0;
    const isUnread = unreadCount > 0;

    let lastSnippet = 'Tap to open chat';
    if (item.last_message) {
      const isMyMsg = item.last_message.sender_id === currentUserId;
      const prefix = isMyMsg ? 'You: ' : isGroup ? `${item.last_message.sender_name}: ` : '';
      const textPreview = item.last_message.message_type === 'attachment'
        ? `📎 ${item.last_message.text_content || 'Photo'}`
        : item.last_message.text_content || 'New message';
      lastSnippet = `${prefix}${textPreview}`;
    } else if (isBroadcast) {
      lastSnippet = 'Official Announcement Channel';
    } else if (isGroup) {
      lastSnippet = 'Group Discussion';
    }

    return (
      <TouchableOpacity 
        style={[styles.chatItem, isUnread && styles.chatItemUnread]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ChatRoom', { 
          id: item.id, 
          title: chatTitle, 
          isGroup: isGroup || isBroadcast, 
          isBroadcast,
          groupAvatarUrl: item.group_avatar_url,
        })}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : isBroadcast ? (
            <MaterialIcons name="campaign" size={24} color="#fff" />
          ) : isGroup ? (
            <MaterialIcons name="groups" size={24} color="#fff" />
          ) : (
            <Text style={styles.avatarText}>{chatTitle.substring(0, 1).toUpperCase()}</Text>
          )}
        </View>

        <View style={styles.chatDetails}>
          <View style={styles.chatHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Text style={[styles.chatName, isUnread && styles.chatNameUnread]} numberOfLines={1}>{chatTitle}</Text>
              {isBroadcast && (
                <View style={[styles.resolvedBadge, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' }]}>
                  <Text style={[styles.resolvedBadgeText, { color: '#E65100' }]}>Broadcast</Text>
                </View>
              )}
              {item.archived_at && (
                <View style={styles.resolvedBadge}>
                  <Text style={styles.resolvedBadgeText}>Resolved</Text>
                </View>
              )}
            </View>
            <Text style={[styles.chatTime, isUnread && styles.chatTimeUnread]}>{timeString}</Text>
          </View>

          <View style={styles.chatSubRow}>
            <Text style={[styles.lastMessage, isUnread && styles.lastMessageUnread]} numberOfLines={1}>
              {lastSnippet}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
              {item.pinned_message_id && (
                <MaterialIcons name="push-pin" size={13} color="#999" style={{ marginRight: 4, transform: [{ rotate: '45deg' }] }} />
              )}
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredStaff = staffList.filter(s => {
    const q = searchQuery.toLowerCase();
    const name = (s.full_name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const activeConversations = conversations.filter(c => !c.archived_at);
  const archivedConversations = conversations.filter(c => !!c.archived_at);
  const baseConversations = chatTab === 'active' ? activeConversations : archivedConversations;
  const totalUnreadCount = activeConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const displayConversations = baseConversations.filter(c => {
    if (searchFilter === 'broadcast' && c.type !== 'broadcast') return false;
    if (searchFilter === 'groups' && c.type !== 'group') return false;

    if (!globalSearch.trim()) return true;

    const q = globalSearch.toLowerCase();
    const isBroadcast = c.type === 'broadcast';
    const isGroup = c.type === 'group';

    if (isBroadcast) {
      if ('official staff broadcast'.includes(q) || 'broadcast'.includes(q) || 'announcement'.includes(q)) return true;
    }
    if (isGroup && (c.group_name || '').toLowerCase().includes(q)) return true;

    const members = c.chat_conversation_members || [];
    const otherMember = members.find((m: any) => m.user_id !== currentUserId);
    const memberName = (otherMember?.users?.full_name || otherMember?.users?.email || '').toLowerCase();
    return memberName.includes(q);
  });

  return (
    <View style={styles.container}>
      {/* WhatsApp Style Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#075E54" style={styles.searchIcon} />
          <TextInput
            style={styles.globalSearchInput}
            placeholder="Search chats, messages, broadcasts..."
            placeholderTextColor="#888"
            value={globalSearch}
            onChangeText={handleGlobalSearchChange}
            returnKeyType="search"
          />
          {globalSearch.length > 0 && (
            <TouchableOpacity onPress={() => handleGlobalSearchChange('')} style={styles.searchClearBtn}>
              <MaterialIcons name="close" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Filter Chips (WhatsApp style) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'broadcast' as const, label: '📢 Broadcasts' },
            { id: 'groups' as const, label: '👥 Groups' },
          ].map(chip => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.filterChip, searchFilter === chip.id && styles.filterChipActive]}
              onPress={() => setSearchFilter(chip.id)}
            >
              <Text style={[styles.filterChipText, searchFilter === chip.id && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Active vs Archived Filter Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, chatTab === 'active' && styles.tabButtonActive]}
          onPress={() => setChatTab('active')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, chatTab === 'active' && styles.tabTextActive]}>
              Chats ({activeConversations.length})
            </Text>
            {totalUnreadCount > 0 && (
              <View style={styles.tabUnreadBadge}>
                <Text style={styles.tabUnreadBadgeText}>{totalUnreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, chatTab === 'archived' && styles.tabButtonActive]}
          onPress={() => setChatTab('archived')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, chatTab === 'archived' && styles.tabTextActive]}>
            Archived ({archivedConversations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#128C7E" />
        </View>
      ) : (
        <FlatList
          data={displayConversations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#128C7E']} 
            />
          }
          ListFooterComponent={
            globalSearch.trim().length >= 2 ? (
              <View style={styles.matchedMessagesSection}>
                <View style={styles.matchedSectionHeader}>
                  <MaterialIcons name="search" size={16} color="#075E54" style={{ marginRight: 6 }} />
                  <Text style={styles.matchedSectionTitle}>
                    Messages matching "{globalSearch}" ({matchedMessages.length})
                  </Text>
                  {searchingMessages && <ActivityIndicator size="small" color="#128C7E" style={{ marginLeft: 8 }} />}
                </View>
                {matchedMessages.length === 0 && !searchingMessages ? (
                  <View style={styles.noMessageCard}>
                    <Text style={styles.noMessageText}>No messages matching "{globalSearch}"</Text>
                  </View>
                ) : (
                  matchedMessages.map((msg) => {
                    const isBcast = msg.conversation?.type === 'broadcast';
                    const title = isBcast
                      ? '📢 Official Staff Broadcast'
                      : msg.conversation?.group_name || msg.sender?.full_name || msg.sender?.email || 'Chat';
                    const time = new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return (
                      <TouchableOpacity
                        key={msg.id}
                        style={styles.matchedMessageCard}
                        onPress={() => {
                          navigation.navigate('ChatRoom', {
                            id: msg.conversation_id,
                            title: title,
                            isGroup: msg.conversation?.type === 'group',
                            initialSearchQuery: globalSearch,
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.matchedMessageTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                            <MaterialIcons
                              name={isBcast ? 'campaign' : 'forum'}
                              size={14}
                              color={isBcast ? '#E65100' : '#128C7E'}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.matchedConvName} numberOfLines={1}>{title}</Text>
                          </View>
                          <Text style={styles.matchedMessageDate}>{time}</Text>
                        </View>
                        <Text style={styles.matchedSenderName} numberOfLines={1}>
                          {msg.sender?.department
                            ? `${msg.sender?.full_name || msg.sender?.email || 'Staff'} (${msg.sender.department})`
                            : (msg.sender?.full_name || msg.sender?.email || 'Staff')}:
                        </Text>
                        <Text style={styles.matchedMessageSnippet} numberOfLines={2}>
                          {msg.text_content}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name={chatTab === 'active' ? "chat-bubble-outline" : "inventory-2"} 
                size={64} 
                color="#ccc" 
              />
              <Text style={styles.emptyText}>
                {chatTab === 'active' ? 'No active chats' : 'No archived chats'}
              </Text>
              <Text style={styles.emptySubText}>
                {chatTab === 'active' 
                  ? 'Tap the green button below to start a conversation or create a group.'
                  : 'Resolved issue chats will appear here for reference and audit.'}
              </Text>
            </View>
          }
          contentContainerStyle={displayConversations.length === 0 ? styles.emptyListContent : undefined}
        />
      )}

      {/* WhatsApp Style FAB */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.8}
        onPress={openNewChatModal}
      >
        <MaterialIcons name="chat" size={24} color="white" />
      </TouchableOpacity>

      {/* New Chat & Group Creation Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => {
          if (modalMode === 'create_group') {
            setModalMode('contacts');
          } else {
            setIsModalVisible(false);
          }
        }}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                if (modalMode === 'create_group') {
                  setModalMode('contacts');
                } else {
                  setIsModalVisible(false);
                }
              }} 
              style={styles.backBtn}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {modalMode === 'contacts' ? 'Select Contact' : 'New Group'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {modalMode === 'contacts' 
                  ? `${staffList.length} staff contacts` 
                  : `${selectedMemberIds.length} of ${staffList.length} selected`}
              </Text>
            </View>
          </View>

          {modalMode === 'contacts' ? (
            <>
              {/* Option to Create New Group */}
              <TouchableOpacity 
                style={styles.newGroupRow}
                onPress={() => setModalMode('create_group')}
                activeOpacity={0.7}
              >
                <View style={styles.newGroupIcon}>
                  <MaterialIcons name="group-add" size={24} color="#fff" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.newGroupText}>New group</Text>
                  <Text style={styles.contactRole}>Create a group discussion with staff</Text>
                </View>
              </TouchableOpacity>

              {/* Search Box */}
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#777" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search staff name or email..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={20} color="#777" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Staff List for Direct Chat */}
              {loadingStaff || creatingChat ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#128C7E" />
                  {creatingChat && <Text style={{ marginTop: 12, color: '#666' }}>Starting chat...</Text>}
                </View>
              ) : (
                <FlatList
                  data={filteredStaff}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.contactItem}
                      onPress={() => startDirectChat(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, { backgroundColor: '#128C7E' }]}>
                        <Text style={styles.avatarText}>
                          {(item.full_name || item.email || 'S').substring(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.contactDetails}>
                        <Text style={styles.contactName}>
                          {item.department ? `${item.full_name || item.email} (${item.department})` : (item.full_name || item.email)}
                        </Text>
                        <Text style={styles.contactRole}>
                          {item.role?.toUpperCase()} • {item.email}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No staff members found</Text>
                    </View>
                  }
                />
              )}
            </>
          ) : (
            /* Create Group Screen */
            <View style={{ flex: 1 }}>
              {/* Group Name Input */}
              <View style={styles.groupInputSection}>
                <View style={styles.groupAvatarCircle}>
                  <MaterialIcons name="groups" size={28} color="#fff" />
                </View>
                <TextInput
                  style={styles.groupNameInput}
                  placeholder="Type group subject here..."
                  placeholderTextColor="#888"
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={50}
                  autoFocus
                />
              </View>

              <Text style={styles.sectionHeader}>
                SELECT PARTICIPANTS ({selectedMemberIds.length} selected)
              </Text>

              {/* Members Selection List */}
              <FlatList
                data={staffList}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedMemberIds.includes(item.id);
                  return (
                    <TouchableOpacity 
                      style={styles.contactItem}
                      onPress={() => toggleMemberSelection(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, { backgroundColor: isSelected ? '#25D366' : '#128C7E' }]}>
                        {isSelected ? (
                          <MaterialIcons name="check" size={22} color="#fff" />
                        ) : (
                          <Text style={styles.avatarText}>
                            {(item.full_name || item.email || 'S').substring(0, 1).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.contactDetails}>
                        <Text style={styles.contactName}>
                          {item.department ? `${item.full_name || item.email} (${item.department})` : (item.full_name || item.email)}
                        </Text>
                        <Text style={styles.contactRole}>
                          {item.role?.toUpperCase()} • {item.email}
                        </Text>
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Create Group Button */}
              {selectedMemberIds.length > 0 && (
                <TouchableOpacity 
                  style={[styles.createGroupBtn, creatingChat && { opacity: 0.7 }]}
                  onPress={handleCreateGroup}
                  disabled={creatingChat}
                  activeOpacity={0.85}
                >
                  {creatingChat ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={24} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.createGroupBtnText}>Create Group ({selectedMemberIds.length})</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* My Staff Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.profileModalContainer}>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={() => setShowProfileModal(false)} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.profileHeaderTitle}>My Staff Profile</Text>
          </View>

          <ScrollView contentContainerStyle={styles.profileScrollContent}>
            {/* Avatar Section */}
            <View style={styles.profileAvatarSection}>
              <View style={styles.profileAvatarWrapper}>
                {currentUserProfile?.avatar_url ? (
                  <Image source={{ uri: currentUserProfile.avatar_url }} style={styles.profileLargeAvatar} />
                ) : (
                  <View style={[styles.profileLargeAvatar, { backgroundColor: '#075E54' }]}>
                    <Text style={styles.profileLargeAvatarText}>
                      {(currentUserProfile?.full_name || currentUserProfile?.email || 'S').substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.profileCameraBadge}
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar}
                  activeOpacity={0.8}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="camera-alt" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.profileEmailSubtitle}>{currentUserProfile?.email}</Text>
              
              <View style={styles.profileBadgeRow}>
                {currentUserProfile?.department && (
                  <View style={styles.profileDeptBadge}>
                    <MaterialIcons name="business" size={13} color="#075E54" style={{ marginRight: 4 }} />
                    <Text style={styles.profileDeptText}>{currentUserProfile.department}</Text>
                  </View>
                )}
                <View style={styles.profileRoleBadge}>
                  <Text style={styles.profileRoleText}>{(currentUserProfile?.role || 'staff').toUpperCase()}</Text>
                </View>
              </View>
            </View>

            {/* Inputs Section */}
            <View style={styles.profileForm}>
              <View style={styles.profileInputGroup}>
                <View style={styles.profileInputLabelRow}>
                  <MaterialIcons name="person" size={18} color="#075E54" style={{ marginRight: 6 }} />
                  <Text style={styles.profileInputLabel}>Full Name</Text>
                </View>
                <TextInput
                  style={styles.profileTextInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.profileInputGroup}>
                <View style={styles.profileInputLabelRow}>
                  <MaterialIcons name="info-outline" size={18} color="#075E54" style={{ marginRight: 6 }} />
                  <Text style={styles.profileInputLabel}>About / Info</Text>
                </View>
                <TextInput
                  style={[styles.profileTextInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="e.g. Operations Lead • Available"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <TouchableOpacity
                style={[styles.profileSaveBtn, savingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.85}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.profileSaveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.profileLogoutBtn}
                onPress={handleLogout}
                activeOpacity={0.85}
              >
                <MaterialIcons name="logout" size={20} color="#D32F2F" style={{ marginRight: 6 }} />
                <Text style={styles.profileLogoutBtnText}>Log Out from RuhChat</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatDetails: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
    paddingBottom: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 24,
    backgroundColor: '#25D366',
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    backgroundColor: '#075E54',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#d4ebd9',
    fontSize: 12,
  },
  newGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  newGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  newGroupText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactDetails: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  contactRole: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  groupInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafafa',
  },
  groupAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#128C7E',
    paddingVertical: 6,
    color: '#111',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#aaa',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkboxSelected: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  createGroupBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  createGroupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#128C7E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#128C7E',
    fontWeight: 'bold',
  },
  resolvedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  resolvedBadgeText: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // WhatsApp Search Bar & Chips
  searchBarWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  globalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A202C',
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#128C7E',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#075E54',
    fontWeight: '700',
  },
  // Matching Messages Section
  matchedMessagesSection: {
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  matchedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  matchedSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#075E54',
  },
  matchedMessageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  matchedMessageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  matchedConvName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A202C',
  },
  matchedMessageDate: {
    fontSize: 11,
    color: '#718096',
  },
  matchedSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#128C7E',
    marginBottom: 2,
  },
  matchedMessageSnippet: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 18,
  },
  noMessageCard: {
    padding: 16,
    alignItems: 'center',
  },
  noMessageText: {
    fontSize: 13,
    color: '#718096',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  headerAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  headerAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatItemUnread: {
    backgroundColor: '#F7FCF9',
  },
  chatNameUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  chatTimeUnread: {
    color: '#25D366',
    fontWeight: '700',
  },
  lastMessageUnread: {
    color: '#1E293B',
    fontWeight: '600',
  },
  chatSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tabUnreadBadge: {
    backgroundColor: '#25D366',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 6,
  },
  tabUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  profileHeader: {
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 16,
  },
  profileScrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  profileAvatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  profileLargeAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLargeAvatarText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: 'bold',
  },
  profileCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#128C7E',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileEmailSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileDeptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  profileDeptText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  profileRoleBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileRoleText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  profileForm: {
    width: '100%',
    marginTop: 12,
  },
  profileInputGroup: {
    marginBottom: 16,
  },
  profileInputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  profileTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  profileSaveBtn: {
    backgroundColor: '#075E54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  profileSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  profileLogoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});


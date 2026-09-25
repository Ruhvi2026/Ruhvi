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
  ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase, getCurrentUserId } from '../lib/supabase';

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

  useEffect(() => {
    const init = async () => {
      let uid = getCurrentUserId();
      if (!uid) {
        uid = await AsyncStorage.getItem('ruhvi_user_id');
      }
      setCurrentUserIdState(uid);
      fetchChats(uid);
    };
    init();

    // Subscribe to live realtime messages & conversations
    const channel = supabase
      .channel('chat_list_global_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchChats();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Automatically refresh conversations whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [currentUserId])
  );

  const fetchChats = async (activeUid?: string | null) => {
    const uid = activeUid !== undefined ? activeUid : currentUserId;
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          id,
          type,
          group_name,
          archived_at,
          created_at,
          updated_at,
          chat_conversation_members (
            user_id,
            users:user_id (
              id,
              full_name,
              email,
              role,
              department
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Fetch chats error:', error);
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

  const getChatTitle = (item: any) => {
    if (item.type === 'group') {
      return item.group_name || 'Group Chat';
    }
    const members = item.chat_conversation_members || [];
    const other = members.find((m: any) => m.user_id !== currentUserId);
    if (other && other.users) {
      const name = other.users.full_name || other.users.email || 'Staff Member';
      return other.users.department ? `${name} (${other.users.department})` : name;
    }
    return 'Staff Chat';
  };

  const renderItem = ({ item }: { item: any }) => {
    const isBroadcast = item.type === 'broadcast';
    const isGroup = item.type === 'group';
    const chatTitle = isBroadcast ? (item.group_name || '📢 Official Broadcast') : getChatTitle(item);
    const avatarColor = isBroadcast ? '#E65100' : isGroup ? '#075E54' : '#' + (item.id.replace(/[^0-9a-f]/gi, '').substring(0, 6) || '128c7e');
    const date = new Date(item.updated_at || item.created_at);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity 
        style={styles.chatItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ChatRoom', { id: item.id, title: chatTitle, isGroup: isGroup || isBroadcast, isBroadcast })}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          {isBroadcast ? (
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
              <Text style={styles.chatName} numberOfLines={1}>{chatTitle}</Text>
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
            <Text style={styles.chatTime}>{timeString}</Text>
          </View>
          <Text style={[styles.lastMessage, item.archived_at && { color: '#2E7D32' }]} numberOfLines={1}>
            {item.archived_at 
              ? 'Issue marked as resolved • Archived'
              : isBroadcast
                ? 'Official Announcement Channel'
                : isGroup 
                  ? 'Group Discussion' 
                  : 'Tap to open chat'}
          </Text>
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
          <Text style={[styles.tabText, chatTab === 'active' && styles.tabTextActive]}>
            Active Chats ({activeConversations.length})
          </Text>
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
});

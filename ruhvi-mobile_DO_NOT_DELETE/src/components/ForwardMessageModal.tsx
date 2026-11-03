// ruhvi-mobile_DO_NOT_DELETE/src/components/ForwardMessageModal.tsx
//
// WhatsApp-style Forward Message Picker for RuhChat Mobile

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase, getCurrentUserId } from '../lib/supabase';

interface ForwardMessageModalProps {
  visible: boolean;
  messageText: string;
  onClose: () => void;
  onForward: (targetConversationId: string, targetName: string) => Promise<void>;
}

export default function ForwardMessageModal({
  visible,
  messageText,
  onClose,
  onForward,
}: ForwardMessageModalProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [forwardingId, setForwardingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadConversations();
    }
  }, [visible]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const uid = getCurrentUserId();
      if (!uid) return;

      const { data, error } = await supabase
        .from('chat_conversation_members')
        .select(`
          conversation_id,
          chat_conversations (
            id,
            type,
            group_name,
            group_avatar_url,
            chat_conversation_members (
              user_id,
              users (
                id,
                full_name,
                email,
                avatar_url,
                role,
                department
              )
            )
          )
        `)
        .eq('user_id', uid);

      if (error) throw error;

      const convList: any[] = [];
      (data || []).forEach((row: any) => {
        const c = row.chat_conversations;
        if (!c) return;

        let title = c.group_name || 'Group Chat';
        let avatarUrl = c.group_avatar_url || null;

        if (c.type === 'direct') {
          const otherMember = (c.chat_conversation_members || []).find(
            (m: any) => m.user_id !== uid
          );
          if (otherMember?.users) {
            title = otherMember.users.full_name || otherMember.users.email || 'Staff';
            avatarUrl = otherMember.users.avatar_url;
          }
        }

        convList.push({
          id: c.id,
          type: c.type,
          title,
          avatarUrl,
        });
      });

      setConversations(convList);
    } catch (err) {
      console.warn('[ForwardMessageModal] Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleSelect = async (c: any) => {
    try {
      setForwardingId(c.id);
      await onForward(c.id, c.title);
      onClose();
    } catch (err) {
      console.warn('[ForwardMessageModal] Forward failed:', err);
    } finally {
      setForwardingId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="arrow-back" size={24} color="#075E54" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Forward to...</Text>
              <Text style={styles.headerSnippet} numberOfLines={1}>
                {messageText ? `"${messageText}"` : 'Attachment'}
              </Text>
            </View>
          </View>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search chat or contact..."
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Conversation List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#075E54" />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.convItem}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item)}
                  disabled={forwardingId === item.id}
                >
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <MaterialIcons
                        name={item.type === 'group' ? 'groups' : 'person'}
                        size={22}
                        color="#fff"
                      />
                    </View>
                  )}

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.type === 'group' ? 'Group Chat' : 'Direct Staff Chat'}
                    </Text>
                  </View>

                  {forwardingId === item.id ? (
                    <ActivityIndicator size="small" color="#075E54" />
                  ) : (
                    <View style={styles.forwardIconBadge}>
                      <MaterialIcons name="send" size={16} color="#075E54" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>No chats found matching search.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '85%',
    minHeight: '60%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#075E54',
  },
  headerSnippet: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    paddingVertical: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f4f4f4',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  forwardIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(7, 94, 84, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

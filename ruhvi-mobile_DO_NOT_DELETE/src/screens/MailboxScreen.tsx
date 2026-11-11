import React, { useEffect, useState, useCallback } from 'react';
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
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '../lib/supabase';

const API_BASE_URL = 'https://ruhvi.in';

interface EmailAddress {
  name?: string;
  email: string;
}

interface EmailMessage {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  date: string;
  read: boolean;
  starred: boolean;
  direction?: 'inbound' | 'outbound';
}

type MailboxFolder = 'inbox' | 'sent' | 'starred';

const AVATAR_COLORS = [
  '#075E54',
  '#128C7E',
  '#2563EB',
  '#7C3AED',
  '#D97706',
  '#DC2626',
  '#0D9488',
];

function getAvatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}

function formatEmailDate(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function MailboxScreen({ navigation }: any) {
  const [folder, setFolder] = useState<MailboxFolder>('inbox');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Email detail modal
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    keyPoints: string[];
    actionItems: string[];
  } | null>(null);

  // Compose email modal
  const [isComposeVisible, setIsComposeVisible] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [polishingDraft, setPolishingDraft] = useState(false);

  // Convert to task modal
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  const fetchMessages = useCallback(async (targetFolder: MailboxFolder) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/api/mailbox/messages?folder=${targetFolder}&mailbox=shreya.maity`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.warn('[Mailbox] Fetch messages error:', e);
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages(folder);
  }, [folder, fetchMessages]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages(folder);
  };

  const handleSelectMessage = async (msg: EmailMessage) => {
    setSelectedMessage(msg);
    setAiSummary(null);

    if (!msg.read) {
      setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, read: true } : m)));
      setUnreadCount(prev => Math.max(0, prev - 1));
      try {
        await fetch(`${API_BASE_URL}/api/mailbox/messages/${msg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
      } catch (_) {}
    }
  };

  const handleToggleStar = async (msg: EmailMessage) => {
    const newStarred = !msg.starred;
    setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, starred: newStarred } : m)));
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage(prev => (prev ? { ...prev, starred: newStarred } : null));
    }

    try {
      await fetch(`${API_BASE_URL}/api/mailbox/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: newStarred }),
      });
    } catch (_) {}
  };

  const handleAISummarize = async () => {
    if (!selectedMessage) return;
    setLoadingSummary(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mailbox/ai/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedMessage.subject,
          body: selectedMessage.bodyText || selectedMessage.snippet,
          from: selectedMessage.from.name || selectedMessage.from.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary({
          summary: data.summary,
          keyPoints: data.keyPoints || [],
          actionItems: data.actionItems || [],
        });
      } else {
        Alert.alert('AI Summary', 'Could not generate summary.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to reach AI service.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handle1ClickReply = async (tone: 'professional' | 'quick' | 'clarify') => {
    if (!selectedMessage) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/mailbox/ai/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedMessage.subject,
          body: selectedMessage.bodyText || selectedMessage.snippet,
          from: selectedMessage.from.name || selectedMessage.from.email,
          tone,
        }),
      });
      const data = await res.json();
      const replyBody = data?.suggestion?.body || '';
      const replySub = selectedMessage.subject.startsWith('Re:')
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject}`;

      setSelectedMessage(null);
      setComposeTo(selectedMessage.from.email);
      setComposeSubject(replySub);
      setComposeBody(replyBody);
      setIsComposeVisible(true);
    } catch (_) {
      setSelectedMessage(null);
      setComposeTo(selectedMessage.from.email);
      setComposeSubject(`Re: ${selectedMessage.subject}`);
      setIsComposeVisible(true);
    }
  };

  const handleOpenTaskModal = (msg: EmailMessage) => {
    setTaskTitle(`[Email] ${msg.subject || 'Inquiry from ' + (msg.from.name || msg.from.email)}`);
    setTaskDescription(
      `From: ${msg.from.name ? `${msg.from.name} <${msg.from.email}>` : msg.from.email}\nDate: ${new Date(msg.date).toLocaleString('en-IN')}\nSubject: ${msg.subject}\n\nSnippet:\n${msg.bodyText || msg.snippet}`
    );
    setIsTaskModalVisible(true);
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Validation', 'Task title is required.');
      return;
    }
    setCreatingTask(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/task-manager/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsTaskModalVisible(false);
        Alert.alert('Success', `Task ${data.task?.task_id_text || 'created'} successfully!`);
      } else {
        Alert.alert('Error', data.error || 'Failed to create task');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error creating task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleAIPolishDraft = async () => {
    if (!composeBody.trim()) {
      Alert.alert('Notice', 'Type a quick draft first, then AI will polish it.');
      return;
    }
    setPolishingDraft(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mailbox/ai/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: composeSubject,
          body: composeBody,
          tone: 'professional',
        }),
      });
      const data = await res.json();
      if (data?.suggestion?.body) {
        setComposeBody(data.suggestion.body);
      }
    } catch (_) {
      Alert.alert('Notice', 'AI polish service is busy.');
    } finally {
      setPolishingDraft(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      Alert.alert('Validation', 'Please fill in To, Subject, and Body.');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mailbox/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'shreya.maity@ruhvi.in',
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          body: composeBody.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsComposeVisible(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        Alert.alert('Sent', 'Email dispatched successfully via EmailOrchestrator!');
        fetchMessages(folder);
      } else {
        Alert.alert('Send Error', data.error || 'Failed to dispatch email');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error dispatching email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Account Info Strip */}
      <View style={styles.accountBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="account-circle" size={18} color="#075E54" />
          <Text style={styles.accountText}>shreya.maity@ruhvi.in</Text>
        </View>
        <Text style={styles.accountRole}>Staff Mailbox</Text>
      </View>

      {/* Folder Tabs */}
      <View style={styles.folderTabs}>
        {[
          { id: 'inbox' as const, label: '📥 Inbox', badge: unreadCount },
          { id: 'sent' as const, label: '📤 Sent' },
          { id: 'starred' as const, label: '⭐ Starred' },
        ].map(tab => {
          const isActive = folder === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.folderTab, isActive && styles.folderTabActive]}
              onPress={() => setFolder(tab.id)}
            >
              <Text style={[styles.folderTabText, isActive && styles.folderTabTextActive]}>
                {tab.label}
              </Text>
              {tab.id === 'inbox' && (tab.badge || 0) > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {(tab.badge || 0) > 9 ? '9+' : tab.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Message List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#075E54" />
          <Text style={styles.loadingText}>Loading emails...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="mail-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No messages in {folder}</Text>
          <Text style={styles.emptySubtitle}>
            Emails received for shreya.maity@ruhvi.in will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#075E54']} />
          }
          renderItem={({ item }) => {
            const isUnread = !item.read;
            const senderName = item.from.name || item.from.email || 'Sender';
            const avatarColor = getAvatarColor(item.from.email || item.id);

            return (
              <TouchableOpacity
                style={[styles.messageCard, isUnread && styles.messageCardUnread]}
                onPress={() => handleSelectMessage(item)}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarText}>
                    {getInitials(item.from.name, item.from.email)}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.senderName, isUnread && styles.senderNameUnread]} numberOfLines={1}>
                      {senderName}
                    </Text>
                    <Text style={styles.dateText}>{formatEmailDate(item.date)}</Text>
                  </View>

                  <Text style={[styles.subjectText, isUnread && styles.subjectTextUnread]} numberOfLines={1}>
                    {item.subject || '(No Subject)'}
                  </Text>

                  <Text style={styles.snippetText} numberOfLines={2}>
                    {item.snippet || 'No text preview available'}
                  </Text>
                </View>

                {/* Star Toggle */}
                <TouchableOpacity
                  onPress={() => handleToggleStar(item)}
                  style={styles.starButton}
                >
                  <MaterialIcons
                    name={item.starred ? 'star' : 'star-outline'}
                    size={20}
                    color={item.starred ? '#D97706' : '#94A3B8'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Compose FAB */}
      <TouchableOpacity
        style={styles.composeFab}
        onPress={() => {
          setComposeTo('');
          setComposeSubject('');
          setComposeBody('');
          setIsComposeVisible(true);
        }}
        activeOpacity={0.8}
        accessibilityLabel="Compose Email"
      >
        <MaterialIcons name="edit" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Email Reader Modal */}
      <Modal
        visible={Boolean(selectedMessage)}
        animationType="slide"
        onRequestClose={() => setSelectedMessage(null)}
      >
        {selectedMessage && (
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedMessage(null)} style={styles.modalCloseBtn}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {selectedMessage.subject || '(No Subject)'}
              </Text>
              <TouchableOpacity onPress={() => handleToggleStar(selectedMessage)}>
                <MaterialIcons
                  name={selectedMessage.starred ? 'star' : 'star-outline'}
                  size={24}
                  color={selectedMessage.starred ? '#FBBF24' : '#fff'}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.readerScroll}>
              {/* Meta Card */}
              <View style={styles.readerMetaCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.avatarSmall, { backgroundColor: getAvatarColor(selectedMessage.from.email) }]}>
                    <Text style={styles.avatarTextSmall}>
                      {getInitials(selectedMessage.from.name, selectedMessage.from.email)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.readerSenderName}>
                      {selectedMessage.from.name || selectedMessage.from.email}
                    </Text>
                    <Text style={styles.readerSenderEmail}>&lt;{selectedMessage.from.email}&gt;</Text>
                  </View>
                </View>

                <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.readerDate}>
                    {new Date(selectedMessage.date).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.readerTo}>
                    To: {selectedMessage.to.map(t => t.email).join(', ') || 'undisclosed'}
                  </Text>
                </View>
              </View>

              {/* Action Bar (AI Summary & Convert to Task) */}
              <View style={styles.readerActionRow}>
                <TouchableOpacity
                  style={styles.actionBtnAi}
                  onPress={handleAISummarize}
                  disabled={loadingSummary}
                >
                  {loadingSummary ? (
                    <ActivityIndicator size="small" color="#7C3AED" />
                  ) : (
                    <>
                      <MaterialIcons name="auto-awesome" size={16} color="#7C3AED" />
                      <Text style={styles.actionBtnAiText}>✨ AI Summary</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnTask}
                  onPress={() => handleOpenTaskModal(selectedMessage)}
                >
                  <MaterialIcons name="assignment" size={16} color="#075E54" />
                  <Text style={styles.actionBtnTaskText}>📌 Convert to Task</Text>
                </TouchableOpacity>
              </View>

              {/* AI Summary View */}
              {aiSummary && (
                <View style={styles.aiSummaryCard}>
                  <Text style={styles.aiSummaryTitle}>📌 Executive Summary</Text>
                  <Text style={styles.aiSummaryText}>{aiSummary.summary}</Text>

                  {aiSummary.keyPoints.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.aiSummarySub}>Key Takeaways:</Text>
                      {aiSummary.keyPoints.map((pt, i) => (
                        <Text key={i} style={styles.aiSummaryBullet}>• {pt}</Text>
                      ))}
                    </View>
                  )}

                  {aiSummary.actionItems.length > 0 && (
                    <View style={styles.aiActionBox}>
                      <Text style={styles.aiActionText}>⚠️ Action: {aiSummary.actionItems.join(' | ')}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Body Content */}
              <View style={styles.readerBodyCard}>
                <Text style={styles.readerBodyText}>
                  {selectedMessage.bodyText || selectedMessage.snippet || '(No message body)'}
                </Text>
              </View>

              {/* 1-Click AI Reply Section */}
              <View style={styles.oneClickReplySection}>
                <Text style={styles.oneClickReplyLabel}>⚡ 1-Click AI Reply:</Text>
                <View style={styles.oneClickButtonsRow}>
                  <TouchableOpacity
                    style={styles.oneClickBtn}
                    onPress={() => handle1ClickReply('professional')}
                  >
                    <Text style={styles.oneClickBtnText}>🤝 Professional</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.oneClickBtn}
                    onPress={() => handle1ClickReply('quick')}
                  >
                    <Text style={styles.oneClickBtnText}>⚡ Quick Ack</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.oneClickBtn}
                    onPress={() => handle1ClickReply('clarify')}
                  >
                    <Text style={styles.oneClickBtnText}>❓ Request Info</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Compose Email Modal */}
      <Modal
        visible={isComposeVisible}
        animationType="slide"
        onRequestClose={() => setIsComposeVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsComposeVisible(false)} style={styles.modalCloseBtn}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Compose Email</Text>
            <TouchableOpacity onPress={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.composeForm}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>From:</Text>
              <Text style={styles.fromBadge}>shreya.maity@ruhvi.in</Text>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>To:</Text>
              <TextInput
                style={styles.inputField}
                value={composeTo}
                onChangeText={setComposeTo}
                placeholder="recipient@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Subject:</Text>
              <TextInput
                style={styles.inputField}
                value={composeSubject}
                onChangeText={setComposeSubject}
                placeholder="Email subject"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.inputLabel}>Message:</Text>
                <TouchableOpacity
                  style={styles.aiPolishBtn}
                  onPress={handleAIPolishDraft}
                  disabled={polishingDraft}
                >
                  {polishingDraft ? (
                    <ActivityIndicator size="small" color="#7C3AED" />
                  ) : (
                    <>
                      <MaterialIcons name="auto-awesome" size={14} color="#7C3AED" />
                      <Text style={styles.aiPolishText}>✨ AI Polish</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.bodyInput}
                value={composeBody}
                onChangeText={setComposeBody}
                placeholder="Write your email here..."
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Convert to Task Modal */}
      <Modal
        visible={isTaskModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTaskModalVisible(false)}
      >
        <View style={styles.taskModalOverlay}>
          <View style={styles.taskModalCard}>
            <View style={styles.taskModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="assignment" size={20} color="#075E54" />
                <Text style={styles.taskModalTitle}>Create Task</Text>
              </View>
              <TouchableOpacity onPress={() => setIsTaskModalVisible(false)}>
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14 }}>
              <Text style={styles.taskFieldLabel}>Title *</Text>
              <TextInput
                style={styles.taskInputField}
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Task title"
              />

              <Text style={[styles.taskFieldLabel, { marginTop: 10 }]}>Notes / Context</Text>
              <TextInput
                style={[styles.taskInputField, { height: 90 }]}
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.taskModalActions}>
                <TouchableOpacity
                  style={styles.taskCancelBtn}
                  onPress={() => setIsTaskModalVisible(false)}
                >
                  <Text style={styles.taskCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.taskSubmitBtn}
                  onPress={handleCreateTask}
                  disabled={creatingTask}
                >
                  {creatingTask ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.taskSubmitText}>Save Task</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  accountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CEEAD6',
  },
  accountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
  },
  accountRole: {
    fontSize: 10,
    fontWeight: '600',
    color: '#137333',
    backgroundColor: '#CEEAD6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  folderTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  folderTabActive: {
    backgroundColor: '#075E54',
  },
  folderTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  folderTabTextActive: {
    color: '#fff',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#075E54',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'capitalize',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  messageCardUnread: {
    backgroundColor: '#F0FDF4',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  senderNameUnread: {
    fontWeight: '700',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6,
  },
  subjectText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  subjectTextUnread: {
    fontWeight: '700',
    color: '#0F172A',
  },
  snippetText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  starButton: {
    padding: 4,
    marginLeft: 6,
  },
  composeFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginHorizontal: 12,
  },
  readerScroll: {
    flex: 1,
    padding: 16,
  },
  readerMetaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  readerSenderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  readerSenderEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  readerDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  readerTo: {
    fontSize: 11,
    color: '#94A3B8',
  },
  readerActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtnAi: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnAiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  actionBtnTask: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnTaskText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
  },
  aiSummaryCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  aiSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
    marginBottom: 4,
  },
  aiSummaryText: {
    fontSize: 12,
    color: '#3B0764',
    lineHeight: 18,
  },
  aiSummarySub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
    marginTop: 4,
    marginBottom: 2,
  },
  aiSummaryBullet: {
    fontSize: 11,
    color: '#4A044E',
    lineHeight: 16,
  },
  aiActionBox: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aiActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  readerBodyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 150,
    marginBottom: 16,
  },
  readerBodyText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
  },
  oneClickReplySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  oneClickReplyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  oneClickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  oneClickBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  oneClickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  composeForm: {
    flex: 1,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  inputLabel: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  fromBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#075E54',
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 2,
  },
  aiPolishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  aiPolishText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  bodyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 180,
  },
  taskModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  taskModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  taskModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  taskModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  taskInputField: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  taskModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  taskCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  taskCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  taskSubmitBtn: {
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  taskSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});


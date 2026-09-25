import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'frequently_used',
    name: 'Popular',
    icon: 'star',
    emojis: [
      '👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉',
      '👏', '😍', '💯', '✨', '👌', '🥰', '🙌', '🚀',
      '🤝', '😎', '💪', '🤩', '💡', '✅', '❌', '👀',
    ],
  },
  {
    id: 'smileys',
    name: 'Smileys',
    icon: 'sentiment-satisfied-alt',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
      '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
      '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯',
      '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
      '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
      '😈', '👿', '💀', '💩', '🤡', '👻', '👽', '🤖',
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: 'pan-tool',
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐',
      '🖖', '👋', '🤝', '👏', '🙌', '👐', '🤲', '🙏',
      '💪', '✍️', '💅', '🤳', '👊', '✊', '🤛', '🤜',
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: 'favorite',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '🔥', '✨', '⭐', '🌟', '💫',
      '💥', '💢', '💤', '💌',
    ],
  },
  {
    id: 'celebrations',
    name: 'Party',
    icon: 'celebration',
    emojis: [
      '🎉', '🎊', '🎈', '🎂', '🎁', '🏆', '🥇', '🥈',
      '🥉', '⚽', '🏀', '🎯', '🎸', '🎮', '☕', '🍵',
      '🍕', '🍔', '🍟', '🍰', '🍦', '🍩', '🍻', '🥂',
    ],
  },
  {
    id: 'work',
    name: 'Office',
    icon: 'business-center',
    emojis: [
      '💼', '📦', '🏷️', '🛍️', '🛒', '💳', '💰', '💵',
      '📈', '📉', '📊', '📋', '📌', '📍', '📎', '✏️',
      '📝', '📱', '💻', '🖥️', '🖨️', '📞', '⏰', '⏳',
      '⌛', '🔑', '🔒', '✅', '❌', '⚠️', '🚀', 'ℹ️',
    ],
  },
];

interface EmojiPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  title?: string;
}

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 7;
const ITEM_SIZE = Math.floor((width - 32) / NUM_COLUMNS);

export default function EmojiPickerModal({
  visible,
  onClose,
  onSelectEmoji,
  title = 'Select Emoji',
}: EmojiPickerModalProps) {
  const [activeTab, setActiveTab] = useState<string>('frequently_used');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentCategory = useMemo(() => {
    return EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];
  }, [activeTab]);

  const displayedEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentCategory.emojis;
    }
    const q = searchQuery.trim().toLowerCase();
    // Search across all categories
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    const unique = Array.from(new Set(all));

    // Simple keyword mapping for common emojis
    const keywordMap: Record<string, string[]> = {
      heart: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
      love: ['❤️', '😍', '🥰', '😘', '💕', '💖', '💗', '💓'],
      like: ['👍', '👌', '❤️', '👏', '🙌'],
      thumb: ['👍', '👎'],
      yes: ['👍', '✅', '👌'],
      no: ['👎', '❌'],
      smile: ['😀', '😃', '😄', '😁', '😆', '😅', '😊', '🙂', '😉'],
      laugh: ['😂', '🤣', '😆', '😹'],
      cry: ['😢', '😭', '😥', '🥺'],
      sad: ['😢', '😭', '😞', '😔', '🙁', '☹️'],
      fire: ['🔥'],
      hot: ['🔥', '🥵'],
      party: ['🎉', '🎊', '🎈', '🥳'],
      check: ['✅', '✔️'],
      cross: ['❌', '❎'],
      star: ['⭐', '🌟', '✨', '💫', '🤩'],
      clap: ['👏', '🙌'],
      pray: ['🙏'],
      ok: ['👌', '👍', '✅'],
      money: ['💰', '💵', '💳', '🤑'],
      work: ['💼', '📦', '📊', '📈', '💻'],
      order: ['📦', '🛍️', '🛒', '🏷️'],
      rocket: ['🚀'],
      warning: ['⚠️'],
      hundred: ['💯'],
    };

    for (const [key, list] of Object.entries(keywordMap)) {
      if (key.includes(q) || q.includes(key)) {
        return list;
      }
    }

    return unique;
  }, [searchQuery, currentCategory]);

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerTitleRow}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Quick Search */}
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={18} color="#888" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search emojis (love, thumb, fire, laugh...)"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="done"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 2 }}>
                  <MaterialIcons name="close" size={16} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Tabs (only when not searching) */}
            {!searchQuery.trim() && (
              <View style={styles.tabsRow}>
                {EMOJI_CATEGORIES.map((cat) => {
                  const isActive = cat.id === activeTab;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                      onPress={() => setActiveTab(cat.id)}
                    >
                      <MaterialIcons
                        name={cat.icon as any}
                        size={20}
                        color={isActive ? '#075E54' : '#888'}
                      />
                      <Text
                        style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Emoji Grid */}
          <FlatList
            data={displayedEmojis}
            keyExtractor={(item, index) => `${item}_${index}`}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.emojiItem}
                activeOpacity={0.6}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.emojiText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.55,
    minHeight: 340,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#075E54',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 36,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#222',
    paddingVertical: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 4,
  },
  tabBtn: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#075E54',
  },
  tabLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#075E54',
    fontWeight: '700',
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emojiItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 26,
  },
});

// ruhvi-mobile_DO_NOT_DELETE/src/components/FileAttachmentCard.tsx
//
// Rich WhatsApp-style File & Document Card for RuhChat Mobile
// Supports: Markdown (.md), HTML (.html), PDF (.pdf), CSV (.csv), Text (.txt), JSON (.json)
// Features: File Type Badges, Inline Preview, Open in Browser, Download & Native Sharing (WhatsApp/Drive/Email)

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  ToastAndroid,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export interface FileItem {
  fileName: string;
  fileType?: string;
  title?: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  contentPreview?: string;
  rawContent?: string;
}

interface FileAttachmentCardProps {
  file: FileItem;
  isMe?: boolean;
}

export default function FileAttachmentCard({ file, isMe = false }: FileAttachmentCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const rawName = file.fileName || 'Document';
  const lowerName = rawName.toLowerCase();
  const rawType = (file.fileType || '').toLowerCase();

  // Determine file category and design accents
  let badgeColor = '#64748B'; // Default slate
  let badgeBg = '#F1F5F9';
  let iconName: any = 'insert-drive-file';
  let typeLabel = 'FILE';

  if (lowerName.endsWith('.pdf') || rawType.includes('pdf')) {
    badgeColor = '#DC2626';
    badgeBg = '#FEE2E2';
    iconName = 'picture-as-pdf';
    typeLabel = 'PDF';
  } else if (
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.markdown') ||
    rawType.includes('markdown')
  ) {
    badgeColor = '#4F46E5';
    badgeBg = '#EEF2FF';
    iconName = 'description';
    typeLabel = 'MARKDOWN';
  } else if (
    lowerName.endsWith('.html') ||
    lowerName.endsWith('.htm') ||
    rawType.includes('html')
  ) {
    badgeColor = '#059669';
    badgeBg = '#ECFDF5';
    iconName = 'code';
    typeLabel = 'HTML';
  } else if (lowerName.endsWith('.csv') || rawType.includes('csv')) {
    badgeColor = '#D97706';
    badgeBg = '#FEF3C7';
    iconName = 'table-chart';
    typeLabel = 'CSV';
  } else if (lowerName.endsWith('.json') || rawType.includes('json')) {
    badgeColor = '#7C3AED';
    badgeBg = '#F3E8FF';
    iconName = 'data-object';
    typeLabel = 'JSON';
  } else if (lowerName.endsWith('.txt') || rawType.includes('text')) {
    badgeColor = '#0284C7';
    badgeBg = '#E0F2FE';
    iconName = 'article';
    typeLabel = 'TEXT';
  }

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedSize = formatSize(file.fileSize);

  // Helper to ensure local file path for Sharing / Download
  const ensureLocalFile = async (): Promise<string> => {
    const cleanFileName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localUri = `${FileSystem.cacheDirectory}${Date.now()}_${cleanFileName}`;

    if (file.fileUrl.startsWith('data:')) {
      // Decode data URI and write to cache
      const base64Data = file.fileUrl.split(',')[1] || '';
      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return localUri;
    } else {
      // Download remote URL to local cache
      const downloadRes = await FileSystem.downloadAsync(file.fileUrl, localUri);
      return downloadRes.uri;
    }
  };

  // Open / View action
  const handleOpen = async () => {
    try {
      if (file.fileUrl.startsWith('data:')) {
        // For data URIs on mobile, open local cached file
        const localUri = await ensureLocalFile();
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri, {
            mimeType: file.mimeType || 'application/octet-stream',
            dialogTitle: `View ${rawName}`,
          });
        }
      } else {
        const canOpen = await Linking.canOpenURL(file.fileUrl);
        if (canOpen) {
          await Linking.openURL(file.fileUrl);
        } else {
          Alert.alert('Cannot Open', 'No application found to view this URL.');
        }
      }
    } catch (err: any) {
      console.warn('Open file error:', err);
      Alert.alert('Error', err.message || 'Could not open file');
    }
  };

  // Native Share sheet (WhatsApp, Email, Drive, Print)
  const handleShare = async () => {
    try {
      setSharing(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this device.');
        return;
      }

      const localPath = await ensureLocalFile();
      await Sharing.shareAsync(localPath, {
        mimeType: file.mimeType || 'application/octet-stream',
        dialogTitle: `Share ${rawName}`,
        UTI: file.mimeType,
      });
    } catch (err: any) {
      console.warn('Share error:', err);
      Alert.alert('Share Failed', err.message || 'Could not share file');
    } finally {
      setSharing(false);
    }
  };

  // Save / Download locally
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const localPath = await ensureLocalFile();

      if (Platform.OS === 'android') {
        ToastAndroid.show(`Saved ${rawName} to device storage`, ToastAndroid.SHORT);
      } else {
        Alert.alert('Saved', `${rawName} is downloaded and ready to view.`);
      }

      // Also trigger system share sheet so user can pick target folder / save to files
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localPath, {
          dialogTitle: `Save ${rawName}`,
        });
      }
    } catch (err: any) {
      console.warn('Download error:', err);
      Alert.alert('Download Failed', err.message || 'Could not download file');
    } finally {
      setDownloading(false);
    }
  };

  const hasInlineText = Boolean(file.rawContent || file.contentPreview);

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerThem]}>
      {/* Header with Icon, Name & Type Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: badgeBg }]}>
          <MaterialIcons name={iconName} size={24} color={badgeColor} />
        </View>

        <View style={styles.metaWrap}>
          <Text style={styles.fileName} numberOfLines={1}>
            {rawName}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{typeLabel}</Text>
            </View>
            {formattedSize ? <Text style={styles.fileSizeText}>{formattedSize}</Text> : null}
          </View>
        </View>
      </View>

      {/* Document Title if present */}
      {file.title && file.title !== rawName ? (
        <Text style={styles.docTitle} numberOfLines={2}>
          {file.title}
        </Text>
      ) : null}

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        {/* Open Button */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleOpen} activeOpacity={0.7}>
          <MaterialIcons name="visibility" size={16} color="#075E54" />
          <Text style={styles.actionBtnText}>Open</Text>
        </TouchableOpacity>

        {/* Share Button (Native WhatsApp/Device Share) */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.7}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#075E54" />
          ) : (
            <>
              <MaterialIcons name="share" size={16} color="#075E54" />
              <Text style={styles.actionBtnText}>Share</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Download Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleDownload}
          disabled={downloading}
          activeOpacity={0.7}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#075E54" />
          ) : (
            <>
              <MaterialIcons name="download" size={16} color="#075E54" />
              <Text style={styles.actionBtnText}>Download</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Inline Preview Toggle (if text content exists) */}
        {hasInlineText ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.previewBtn]}
            onPress={() => setShowPreviewModal(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="menu-book" size={16} color="#4F46E5" />
            <Text style={[styles.actionBtnText, { color: '#4F46E5' }]}>Preview</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Inline Quick Text Preview Modal */}
      {hasInlineText ? (
        <Modal
          visible={showPreviewModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={[styles.iconWrapSmall, { backgroundColor: badgeBg }]}>
                  <MaterialIcons name={iconName} size={18} color={badgeColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.previewModalTitle} numberOfLines={1}>
                    {rawName}
                  </Text>
                  <Text style={styles.previewModalSub}>
                    {typeLabel} • {formattedSize || 'Text'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowPreviewModal(false)}
                  style={styles.closePreviewBtn}
                >
                  <MaterialIcons name="close" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.previewScroll} contentContainerStyle={{ padding: 14 }}>
                <Text style={styles.previewBodyText} selectable>
                  {file.rawContent || file.contentPreview}
                </Text>
              </ScrollView>

              <View style={styles.previewFooter}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: '#075E54' }]}
                  onPress={handleShare}
                >
                  <MaterialIcons name="share" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalActionBtnText}>Share Document</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    minWidth: 240,
    maxWidth: 290,
  },
  containerThem: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  containerMe: {
    backgroundColor: '#DCF8C6',
    borderColor: '#BBF7D0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metaWrap: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginRight: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fileSizeText: {
    fontSize: 11,
    color: '#64748B',
  },
  docTitle: {
    fontSize: 12,
    color: '#334155',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#CBD5E1',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  previewBtn: {
    backgroundColor: '#EEF2FF',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#075E54',
    marginLeft: 3,
  },
  // Preview Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewCard: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  iconWrapSmall: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewModalSub: {
    fontSize: 11,
    color: '#64748B',
  },
  closePreviewBtn: {
    padding: 4,
  },
  previewScroll: {
    backgroundColor: '#FFFFFF',
  },
  previewBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


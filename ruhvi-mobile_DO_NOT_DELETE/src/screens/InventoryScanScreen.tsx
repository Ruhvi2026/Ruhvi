import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase, getCurrentUserId } from '../lib/supabase';
import {
  saveScanLocally,
  getQueuedScans,
  uploadPendingToStaging,
  syncQueueWithRemote,
  deleteQueueItem,
  clearSyncedItems,
  getQueueSummary,
} from '../lib/scanQueue';
import { LocalScanItem, QueueSummary } from '../types/inventory';

export default function InventoryScanScreen({ navigation }: any) {
  // Navigation tabs: 'scan' | 'queue'
  const [activeTab, setActiveTab] = useState<'scan' | 'queue'>('scan');

  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const lastScannedTimeRef = useRef<number>(0);

  // Form state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [sku, setSku] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('1');
  const [productName, setProductName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [collection, setCollection] = useState('');
  const [notes, setNotes] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [actionType, setActionType] = useState<'auto' | 'create_product' | 'update_stock'>('auto');

  // Duplicate prompt modal state
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [existingProductInfo, setExistingProductInfo] = useState<any>(null);

  // Queue state
  const [queue, setQueue] = useState<LocalScanItem[]>([]);
  const [summary, setSummary] = useState<QueueSummary>({
    total: 0,
    savedLocally: 0,
    staged: 0,
    synced: 0,
    failed: 0,
  });
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();

    // Subscribe to Realtime updates on inventory_staging so phone receives green tick automatically
    const userId = getCurrentUserId();
    let channel: any = null;

    if (userId) {
      channel = supabase
        .channel(`scan_sync_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'inventory_staging',
            filter: `owner_id=eq.${userId}`,
          },
          async (payload: any) => {
            if (payload.new) {
              await syncQueueWithRemote();
              await loadQueue();
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeTab]);

  const loadQueue = async () => {
    try {
      const items = await getQueuedScans();
      setQueue(items);
      const summ = await getQueueSummary();
      setSummary(summ);
    } catch (e) {
      console.error('Error loading queue:', e);
    }
  };

  const handleRefreshQueue = async () => {
    setIsRefreshingQueue(true);
    try {
      await uploadPendingToStaging();
      await syncQueueWithRemote();
      await loadQueue();
    } catch (e) {
      console.error('Error refreshing queue:', e);
    } finally {
      setIsRefreshingQueue(false);
    }
  };

  // Barcode scanned callback
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    const now = Date.now();
    // Debounce scans to avoid multi-triggers (min 2 seconds)
    if (now - lastScannedTimeRef.current < 2000) return;
    lastScannedTimeRef.current = now;

    const trimmed = (data || '').trim();
    if (!trimmed || trimmed === scannedBarcode) return;

    setScannedBarcode(trimmed);
    setBarcodeInput(trimmed);
    setCameraActive(false); // Pause camera viewfinder while processing

    // Catalog lookup
    await lookupProductByBarcodeOrSku(trimmed);
  };

  // Check Supabase if product exists
  const lookupProductByBarcodeOrSku = async (code: string) => {
    setIsLookingUp(true);
    try {
      // 1. Check by barcode
      let { data: product } = await supabase
        .from('products')
        .select('id, name, sku, barcode, cost_price, weight_grams, stock_quantity, price, mrp, collection')
        .eq('barcode', code)
        .maybeSingle();

      // 2. Fallback check by SKU
      if (!product) {
        const { data: bySku } = await supabase
          .from('products')
          .select('id, name, sku, barcode, cost_price, weight_grams, stock_quantity, price, mrp, collection')
          .eq('sku', code.toUpperCase())
          .maybeSingle();
        if (bySku) product = bySku;
      }

      if (product) {
        // Product exists! Prompt staff per User Requirement
        setExistingProductInfo(product);
        setDuplicateModalVisible(true);
      } else {
        // Unregistered barcode
        setSku(code.toUpperCase());
        setActionType('create_product');
        setSuccessBanner(`Scanned: ${code} (Unregistered)`);
        setTimeout(() => setSuccessBanner(null), 3000);
      }
    } catch (err: any) {
      console.warn('Catalog lookup error:', err);
      setSku(code.toUpperCase());
    } finally {
      setIsLookingUp(false);
    }
  };

  // Staff selected "Update SKU / Stock"
  const handleSelectUpdateExisting = () => {
    if (existingProductInfo) {
      setSku(existingProductInfo.sku || '');
      setProductName(existingProductInfo.name || '');
      setWeightGrams(existingProductInfo.weight_grams ? String(existingProductInfo.weight_grams) : '');
      setCostPrice(existingProductInfo.cost_price ? String(existingProductInfo.cost_price) : '');
      setSellingPrice(existingProductInfo.price ? String(existingProductInfo.price) : '');
      setMrp(existingProductInfo.mrp ? String(existingProductInfo.mrp) : '');
      setCollection(existingProductInfo.collection || '');
      setStockQuantity('1'); // Default to add 1 piece
      setActionType('update_stock');
    }
    setDuplicateModalVisible(false);
  };

  // Staff selected "Skip"
  const handleSelectSkip = () => {
    setDuplicateModalVisible(false);
    setExistingProductInfo(null);
    resetForm();
    setCameraActive(true); // Re-arm camera
  };

  const resetForm = () => {
    setScannedBarcode('');
    setBarcodeInput('');
    setSku('');
    setWeightGrams('');
    setCostPrice('');
    setStockQuantity('1');
    setProductName('');
    setSellingPrice('');
    setMrp('');
    setCollection('');
    setNotes('');
    setActionType('auto');
  };

  // Save scan locally
  const handleSave = async (andScanNext: boolean = true) => {
    // Validation
    const cleanSku = sku.trim().toUpperCase();
    const cleanBarcode = (barcodeInput || scannedBarcode).trim();
    const weightNum = parseFloat(weightGrams);
    const costNum = parseFloat(costPrice);
    const stockNum = parseInt(stockQuantity, 10);

    if (!cleanBarcode) {
      Alert.alert('Validation Error', 'Please scan or enter a Barcode');
      return;
    }
    if (!cleanSku) {
      Alert.alert('Validation Error', 'Please enter a SKU (Mandatory)');
      return;
    }
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Validation Error', 'Weight must be greater than 0g (Mandatory)');
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      Alert.alert('Validation Error', 'Purchase price must be >= 0 (Mandatory)');
      return;
    }
    if (isNaN(stockNum) || stockNum < 1) {
      Alert.alert('Validation Error', 'Stock quantity must be at least 1 (Mandatory)');
      return;
    }

    try {
      await saveScanLocally({
        barcode: cleanBarcode,
        sku: cleanSku,
        weight_grams: weightNum,
        cost_price: costNum,
        stock_quantity: stockNum,
        product_name: productName ? productName.trim() : null,
        price: parseFloat(sellingPrice) || null,
        mrp: parseFloat(mrp) || null,
        collection: collection ? collection.trim() : null,
        notes: notes ? notes.trim() : null,
        action_type: actionType,
      });

      setSuccessBanner(`Saved: ${cleanSku} (Stored locally on device)`);
      setTimeout(() => setSuccessBanner(null), 3000);

      resetForm();
      await loadQueue();

      if (andScanNext) {
        setCameraActive(true);
      } else {
        setActiveTab('queue');
      }
    } catch (err: any) {
      Alert.alert('Error Saving Scan', err.message || 'Unknown storage error');
    }
  };

  const handleDeleteItem = async (id: string, itemSku: string) => {
    Alert.alert('Delete Scan', `Remove SKU ${itemSku} from local queue?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteQueueItem(id);
          await loadQueue();
        },
      },
    ]);
  };

  const handleClearSynced = async () => {
    Alert.alert('Clear Synced', 'Remove all synced records from device view?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          await clearSyncedItems();
          await loadQueue();
        },
      },
    ]);
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'saved_locally':
        return (
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <MaterialIcons name="schedule" size={13} color="#D97706" />
            <Text style={[styles.badgeText, { color: '#B45309' }]}>Saved Locally (Offline)</Text>
          </View>
        );
      case 'staged':
        return (
          <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
            <MaterialIcons name="cloud-queue" size={13} color="#0284C7" />
            <Text style={[styles.badgeText, { color: '#0369A1' }]}>Staged to Cloud</Text>
          </View>
        );
      case 'synced':
        return (
          <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
            <Text style={[styles.badgeText, { color: '#15803D' }]}>Synced to Catalog</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
            <MaterialIcons name="error-outline" size={13} color="#DC2626" />
            <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Sync Error</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      {/* Top Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'scan' && styles.tabButtonActive]}
          onPress={() => setActiveTab('scan')}
        >
          <MaterialIcons
            name="qr-code-scanner"
            size={20}
            color={activeTab === 'scan' ? '#C5A880' : '#A8A29E'}
          />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.tabTextActive]}>
            Scan & Enter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'queue' && styles.tabButtonActive]}
          onPress={() => setActiveTab('queue')}
        >
          <MaterialIcons
            name="view-list"
            size={20}
            color={activeTab === 'queue' ? '#C5A880' : '#A8A29E'}
          />
          <Text style={[styles.tabText, activeTab === 'queue' && styles.tabTextActive]}>
            Queue ({summary.total})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Notification Banner */}
      {successBanner && (
        <View style={styles.banner}>
          <Ionicons name="checkmark-circle" size={18} color="#065F46" />
          <Text style={styles.bannerText}>{successBanner}</Text>
        </View>
      )}

      {/* ===================== TAB 1: SCAN & ENTER ===================== */}
      {activeTab === 'scan' ? (
        <ScrollView style={styles.contentScroll} keyboardShouldPersistTaps="handled">
          {/* Camera Viewfinder Section */}
          <View style={styles.cameraCard}>
            {cameraActive ? (
              permission?.granted ? (
                <View style={styles.cameraWrapper}>
                  <CameraView
                    style={styles.camera}
                    enableTorch={torchOn}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a'],
                    }}
                    onBarcodeScanned={handleBarcodeScanned}
                  >
                    <View style={styles.overlay}>
                      <View style={styles.scanTargetBox} />
                      <Text style={styles.scanGuideText}>Align barcode inside frame</Text>
                    </View>
                  </CameraView>

                  {/* Camera Controls */}
                  <View style={styles.cameraControlsBar}>
                    <TouchableOpacity
                      style={styles.camIconBtn}
                      onPress={() => setTorchOn(!torchOn)}
                      accessibilityLabel="Toggle Torch"
                    >
                      <MaterialIcons
                        name={torchOn ? 'flash-on' : 'flash-off'}
                        size={22}
                        color={torchOn ? '#F59E0B' : '#FFF'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.camTextBtn}
                      onPress={() => setCameraActive(false)}
                    >
                      <Text style={styles.camBtnText}>Manual Entry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.permissionBox}>
                  <MaterialIcons name="camera-alt" size={40} color="#78716C" />
                  <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                  <Text style={styles.permissionSub}>
                    Allow camera access to scan barcodes on physical jewellery tags.
                  </Text>
                  <TouchableOpacity style={styles.goldBtn} onPress={requestPermission}>
                    <Text style={styles.goldBtnText}>Grant Camera Permission</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={styles.pausedBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="qr-code" size={24} color="#075E54" />
                  <Text style={styles.pausedTitle}>
                    {barcodeInput ? `Barcode: ${barcodeInput}` : 'Manual Input Mode'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.reopenCamBtn}
                  onPress={() => {
                    setScannedBarcode('');
                    setCameraActive(true);
                  }}
                >
                  <MaterialIcons name="camera-alt" size={16} color="#075E54" />
                  <Text style={styles.reopenCamText}>Re-open Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Product Inventory Details</Text>

            {isLookingUp && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#C5A880" />
                <Text style={styles.loadingText}>Checking catalog for barcode...</Text>
              </View>
            )}

            {/* Barcode Input (Manual / Scanned) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                BARCODE <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Scan or type barcode"
                  placeholderTextColor="#A8A29E"
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  onBlur={() => {
                    if (barcodeInput.trim() && barcodeInput !== scannedBarcode) {
                      lookupProductByBarcodeOrSku(barcodeInput.trim());
                    }
                  }}
                />
                {!cameraActive && (
                  <TouchableOpacity
                    style={styles.fieldIconBtn}
                    onPress={() => setCameraActive(true)}
                  >
                    <MaterialIcons name="camera-alt" size={20} color="#075E54" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* SKU (Mandatory) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                SKU <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. RV-RN-001"
                placeholderTextColor="#A8A29E"
                value={sku}
                onChangeText={(t) => setSku(t.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>

            {/* Two-Column Row: Weight & Cost Price */}
            <View style={styles.twoColRow}>
              {/* Weight in Grams (Mandatory) */}
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>
                  WEIGHT (g) <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 4.85"
                  placeholderTextColor="#A8A29E"
                  keyboardType="decimal-pad"
                  value={weightGrams}
                  onChangeText={setWeightGrams}
                />
              </View>

              {/* Purchase Price (Mandatory) */}
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>
                  PURCHASE PRICE (₹) <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1850"
                  placeholderTextColor="#A8A29E"
                  keyboardType="decimal-pad"
                  value={costPrice}
                  onChangeText={setCostPrice}
                />
              </View>
            </View>

            {/* Stock Quantity (Mandatory) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                STOCK QUANTITY <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const q = Math.max(1, (parseInt(stockQuantity, 10) || 1) - 1);
                    setStockQuantity(String(q));
                  }}
                >
                  <MaterialIcons name="remove" size={20} color="#075E54" />
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, styles.stepperInput]}
                  keyboardType="number-pad"
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                />

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const q = (parseInt(stockQuantity, 10) || 0) + 1;
                    setStockQuantity(String(q));
                  }}
                >
                  <MaterialIcons name="add" size={20} color="#075E54" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Collapsible Optional Section */}
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setShowOptional(!showOptional)}
            >
              <Text style={styles.collapsibleTitle}>
                {showOptional ? 'Hide Additional Details' : '+ Add Optional Details (Name, Selling Price, MRP)'}
              </Text>
              <MaterialIcons
                name={showOptional ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color="#78716C"
              />
            </TouchableOpacity>

            {showOptional && (
              <View style={styles.optionalBox}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PRODUCT NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Royal Kundan Choker"
                    placeholderTextColor="#A8A29E"
                    value={productName}
                    onChangeText={setProductName}
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>SELLING PRICE (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 2999"
                      placeholderTextColor="#A8A29E"
                      keyboardType="decimal-pad"
                      value={sellingPrice}
                      onChangeText={setSellingPrice}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>MRP (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 4500"
                      placeholderTextColor="#A8A29E"
                      keyboardType="decimal-pad"
                      value={mrp}
                      onChangeText={setMrp}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>COLLECTION</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Festive Bridal 2026"
                    placeholderTextColor="#A8A29E"
                    value={collection}
                    onChangeText={setCollection}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NOTES / REMARKS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rack B4, Tray 2"
                    placeholderTextColor="#A8A29E"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 2, marginRight: 8 }]}
                onPress={() => handleSave(true)}
              >
                <MaterialIcons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Save & Next Scan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => handleSave(false)}
              >
                <Text style={styles.secondaryBtnText}>Save & View</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ===================== TAB 2: QUEUE & RECENT SCANS ===================== */
        <View style={styles.queueContainer}>
          {/* Summary Pills Bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryCount}>{summary.savedLocally}</Text>
              <Text style={styles.summaryLabel}>Offline</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={[styles.summaryCount, { color: '#0284C7' }]}>{summary.staged}</Text>
              <Text style={styles.summaryLabel}>Staged</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={[styles.summaryCount, { color: '#16A34A' }]}>{summary.synced}</Text>
              <Text style={styles.summaryLabel}>Synced</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={[styles.summaryCount, { color: '#DC2626' }]}>{summary.failed}</Text>
              <Text style={styles.summaryLabel}>Errors</Text>
            </View>
          </View>

          {/* Action Header */}
          <View style={styles.queueHeaderRow}>
            <Text style={styles.queueHeaderTitle}>Scanned Items ({queue.length})</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.actionChip}
                onPress={handleRefreshQueue}
                disabled={isRefreshingQueue}
              >
                {isRefreshingQueue ? (
                  <ActivityIndicator size="small" color="#075E54" />
                ) : (
                  <>
                    <MaterialIcons name="sync" size={16} color="#075E54" />
                    <Text style={styles.actionChipText}>Refresh</Text>
                  </>
                )}
              </TouchableOpacity>

              {summary.synced > 0 && (
                <TouchableOpacity style={styles.actionChip} onPress={handleClearSynced}>
                  <MaterialIcons name="cleaning-services" size={16} color="#78716C" />
                  <Text style={[styles.actionChipText, { color: '#78716C' }]}>Clear Synced</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Queue List */}
          {queue.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="inventory" size={48} color="#D6D3D1" />
              <Text style={styles.emptyTitle}>Queue is empty</Text>
              <Text style={styles.emptySubtitle}>
                Scan your first jewellery barcode using the "Scan & Enter" tab.
              </Text>
              <TouchableOpacity
                style={styles.goldBtn}
                onPress={() => setActiveTab('scan')}
              >
                <Text style={styles.goldBtnText}>Start Scanning</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <View style={styles.queueCard}>
                  <View style={styles.queueCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.queueSku}>{item.sku}</Text>
                      <Text style={styles.queueBarcode}>Barcode: {item.barcode}</Text>
                    </View>
                    {renderStatusBadge(item.status)}
                  </View>

                  <View style={styles.queueDetailsRow}>
                    <Text style={styles.queueMeta}>
                      Weight: <Text style={styles.queueBold}>{item.weight_grams}g</Text>
                    </Text>
                    <Text style={styles.queueMeta}>
                      Cost: <Text style={styles.queueBold}>₹{item.cost_price}</Text>
                    </Text>
                    <Text style={styles.queueMeta}>
                      Qty: <Text style={styles.queueBold}>{item.stock_quantity}</Text>
                    </Text>
                  </View>

                  {item.product_name && (
                    <Text style={styles.queueProductName}>{item.product_name}</Text>
                  )}

                  {item.sync_error && (
                    <Text style={styles.queueErrorText}>⚠️ {item.sync_error}</Text>
                  )}

                  <View style={styles.queueFooter}>
                    <Text style={styles.queueTimestamp}>
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {item.status !== 'synced' && (
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => handleDeleteItem(item.id, item.sku)}
                      >
                        <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ===================== DUPLICATE ITEM MODAL ===================== */}
      <Modal
        visible={duplicateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleSelectSkip}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <MaterialIcons name="inventory-2" size={32} color="#D97706" />
            </View>

            <Text style={styles.modalTitle}>Item Already Exists</Text>
            <Text style={styles.modalDesc}>
              This barcode or SKU is already registered in the Ruhvi catalog:
            </Text>

            {existingProductInfo && (
              <View style={styles.existingInfoBox}>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Product: </Text>
                  {existingProductInfo.name || 'Unnamed Product'}
                </Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>SKU: </Text>
                  {existingProductInfo.sku}
                </Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Current Stock: </Text>
                  <Text style={{ fontWeight: 'bold', color: '#075E54' }}>
                    {existingProductInfo.stock_quantity} pieces
                  </Text>
                </Text>
              </View>
            )}

            <View style={styles.modalBtnColumn}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSelectUpdateExisting}
              >
                <MaterialIcons name="edit" size={18} color="#FFF" />
                <Text style={styles.modalPrimaryBtnText}>Update SKU / Stock</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={handleSelectSkip}
              >
                <Text style={styles.modalSecondaryBtnText}>Skip This Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#075E54',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#054C44',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#C5A880',
  },
  tabText: {
    color: '#A8A29E',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  bannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  cameraCard: {
    backgroundColor: '#000',
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  cameraWrapper: {
    height: 240,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetBox: {
    width: 200,
    height: 120,
    borderWidth: 2,
    borderColor: '#C5A880',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  scanGuideText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cameraControlsBar: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  camIconBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  camTextBtn: {
    backgroundColor: 'rgba(7, 94, 84, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  camBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1917',
    marginTop: 12,
  },
  permissionSub: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  pausedBox: {
    backgroundColor: '#FFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pausedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1917',
  },
  reopenCamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E7F2F0',
  },
  reopenCamText: {
    color: '#075E54',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1917',
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#C5A880',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534E',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  requiredMark: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#D6D3D1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1C1917',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIconBtn: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    backgroundColor: '#E7F2F0',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8DBD6',
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
    fontWeight: 'bold',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
    marginTop: 4,
  },
  collapsibleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  optionalBox: {
    backgroundColor: '#FAF8F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  primaryBtn: {
    backgroundColor: '#075E54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#C5A880',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: '#075E54',
    fontSize: 13,
    fontWeight: '600',
  },
  goldBtn: {
    backgroundColor: '#C5A880',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  goldBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  queueContainer: {
    flex: 1,
    padding: 12,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D97706',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  queueHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1917',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F2F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionChipText: {
    fontSize: 12,
    color: '#075E54',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#44403C',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  queueCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  queueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  queueSku: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1917',
  },
  queueBarcode: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  queueDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  queueMeta: {
    fontSize: 12,
    color: '#57534E',
  },
  queueBold: {
    fontWeight: 'bold',
    color: '#1C1917',
  },
  queueProductName: {
    fontSize: 12,
    color: '#78716C',
    fontStyle: 'italic',
    marginTop: 4,
  },
  queueErrorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
  },
  queueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },
  queueTimestamp: {
    fontSize: 11,
    color: '#A8A29E',
  },
  deleteIconBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 30,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1917',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 12,
  },
  existingInfoBox: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  infoRow: {
    fontSize: 13,
    color: '#1C1917',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#78716C',
  },
  modalBtnColumn: {
    width: '100%',
    gap: 8,
  },
  modalPrimaryBtn: {
    backgroundColor: '#075E54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalPrimaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalSecondaryBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#D6D3D1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSecondaryBtnText: {
    color: '#57534E',
    fontSize: 13,
    fontWeight: '600',
  },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Alert, Pressable, Image, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBadge, Card, Button, LoadingScreen, Input } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius, statusLabels } from '../theme';
import type { RootStackParamList, OrderStatus } from '../types';

type Nav = import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OrderDetail'>;

interface OrderDetailData {
  id: number;
  reference_code: string;
  overall_status: OrderStatus;
  visit_date: string;
  storage_code: string | null;
  notes: string | null;
  first_name: string;
  last_name: string;
  customer_id: number;
  email: string | null;
  phone: string | null;
  created_at: string;
  items: Array<{
    id: number;
    item_type_name: string;
    quantity: number;
    status: OrderStatus;
    storage_code: string | null;
  }>;
  status_log: Array<{
    id: number;
    old_status: string | null;
    new_status: string;
    changed_by: string | null;
    note: string | null;
    changed_at: string;
  }>;
}

const STATUS_FLOW: OrderStatus[] = [
  'ERFASST', 'WARTET_AUF_BRENNEN', 'IM_BRENNOFEN', 'GEBRANNT', 'ABHOLBEREIT', 'ABGEHOLT',
];

export function OrderDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photos, setPhotos] = useState<Array<{ key: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const result = await api.get<any>(`/orders/${route.params.id}`);
      const d = result?.data || result;
      const orderData = d?.order || d;
      if (!orderData) throw new Error('Keine Auftragsdaten');
      orderData.items = d?.items || [];
      orderData.status_log = d?.status_log || [];
      setOrder(orderData);
    } catch (error) {
      console.error('Auftrag laden fehlgeschlagen:', error);
      Alert.alert('Fehler', 'Auftrag konnte nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.id]);

  const loadPhotos = useCallback(async () => {
    try {
      const result = await api.get<any>(`/orders/${route.params.id}/photos`);
      const data = result?.data || [];
      setPhotos(Array.isArray(data) ? data : []);
    } catch { setPhotos([]); }
  }, [route.params.id]);

  const pickAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung nötig', 'Bitte erlaube Zugriff auf die Fotobibliothek');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled) return;
    await doUpload(result.assets[0].uri);
  };

  const takeAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung nötig', 'Bitte erlaube Zugriff auf die Kamera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled) return;
    await doUpload(result.assets[0].uri);
  };

  const doUpload = async (uri: string) => {
    setUploading(true);
    try {
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      const formData = new FormData();
      formData.append('photo', { uri, name: filename, type } as any);
      const res = await fetch(`https://keramik-auszeit.de/api/admin/brenn/orders/${route.params.id}/photos`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      Alert.alert('Foto gespeichert');
      loadPhotos();
    } catch (e: any) {
      Alert.alert('Upload fehlgeschlagen', e.message);
    } finally {
      setUploading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrder();
      loadPhotos();
    }, [loadOrder, loadPhotos])
  );

  const [statusChanging, setStatusChanging] = useState(false);
  const [showOvenPicker, setShowOvenPicker] = useState(false);
  const [showFachPicker, setShowFachPicker] = useState(false);

  const updateStatus = async (newStatus: OrderStatus, storageId?: number) => {
    // Bei IM_BRENNOFEN → Ofen-Auswahl anzeigen
    if (newStatus === 'IM_BRENNOFEN' && !storageId) {
      setShowOvenPicker(true);
      setShowFachPicker(false);
      return;
    }
    // Bei ABHOLBEREIT → Fach-Auswahl anzeigen
    if (newStatus === 'ABHOLBEREIT' && !storageId) {
      setShowFachPicker(true);
      setShowOvenPicker(false);
      return;
    }

    setStatusChanging(true);
    setShowOvenPicker(false);
    try {
      // Wenn Ofen gewählt, Lagerort gleichzeitig setzen
      if (storageId) {
        await api.patch(`/orders/${route.params.id}`, { storage_location_id: storageId });
      }
      await api.patch(`/orders/${route.params.id}/status`, {
        new_status: newStatus,
        note: `Status geändert zu ${statusLabels[newStatus] || newStatus}`,
      });
      loadOrder();
    } catch (error: any) {
      Alert.alert('Fehler', error?.message || 'Status konnte nicht geändert werden');
    } finally {
      setStatusChanging(false);
    }
  };

  const handlePickup = async () => {
    if (!order) return;
    Alert.alert(
      'Abholung bestätigen',
      `Auftrag ${order.reference_code} als abgeholt markieren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abgeholt',
          onPress: async () => {
            try {
              await api.post(`/orders/${route.params.id}/pickup`, {
                picked_up_by: `${order.first_name} ${order.last_name}`,
              });
              loadOrder();
            } catch (e) {
              Alert.alert('Fehler', 'Abholung konnte nicht gespeichert werden');
            }
          },
        },
      ]
    );
  };

  const ITEM_TYPES = ['Tasse', 'Becher', 'Teller', 'Schale', 'Vase', 'Figur', 'Dose', 'Untersetzer', 'Spardose', 'Sonstiges'];
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemType, setNewItemType] = useState('Tasse');
  const [newItemQty, setNewItemQty] = useState('1');
  const [addingItem, setAddingItem] = useState(false);

  const handleAddItem = async () => {
    setAddingItem(true);
    try {
      await api.post(`/orders/${route.params.id}/items`, {
        item_type: newItemType,
        quantity: parseInt(newItemQty) || 1,
      });
      setShowAddItem(false);
      setNewItemType('Tasse');
      setNewItemQty('1');
      loadOrder();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Werkstück konnte nicht hinzugefügt werden');
    } finally {
      setAddingItem(false);
    }
  };

  const [storageLocations, setStorageLocations] = useState<Array<{id: number; code: string}>>([]);

  const loadStorageLocations = useCallback(async () => {
    try {
      const result = await api.get<any>('/storage-locations');
      const locs = result?.data || result || [];
      setStorageLocations(Array.isArray(locs) ? locs.filter((l: any) => l.is_active) : []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadStorageLocations(); }, [loadStorageLocations]));

  const setStorage = async (locationId: number) => {
    try {
      await api.patch(`/orders/${route.params.id}`, { storage_location_id: locationId });
      loadOrder();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Lagerort konnte nicht gesetzt werden');
    }
  };

  if (loading && !order) return <LoadingScreen />;
  if (!order) return null;

  const customerName = `${order.first_name || ''} ${order.last_name || ''}`.trim();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrder(); }} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.refCode}>{order.reference_code}</Text>
        <StatusBadge status={order.overall_status} />
      </View>

      {/* Kunde */}
      <Card>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <View style={styles.rowContent}>
            <Text style={styles.label}>Kunde</Text>
            <Text style={styles.value}>{customerName}</Text>
            {order.email && <Text style={styles.subValue}>{order.email}</Text>}
            {order.phone && <Text style={styles.subValue}>{order.phone}</Text>}
          </View>
        </View>
      </Card>

      {/* Details */}
      <Card>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailGrid}>
          <DetailItem label="Besuchsdatum" value={new Date(order.visit_date).toLocaleDateString('de-DE')} />
        </View>
      </Card>

      {/* Lagerort */}
      <Card>
        <Text style={styles.sectionTitle}>Lagerort</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.storageRow}>
            {storageLocations.map(loc => (
              <Pressable
                key={loc.id}
                onPress={() => setStorage(loc.id)}
                style={[
                  styles.storageChip,
                  order.storage_code === loc.code && styles.storageChipActive,
                ]}
              >
                <Text style={[
                  styles.storageChipText,
                  order.storage_code === loc.code && styles.storageChipTextActive,
                ]}>
                  {loc.code}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {order.storage_code && (
          <Text style={styles.storageInfo}>Aktuell: {order.storage_code}</Text>
        )}
      </Card>

      {/* Positionen */}
      <Card>
        <View style={styles.itemsHeader}>
          <Text style={styles.sectionTitle}>Werkstücke ({order.items?.length || 0})</Text>
          <Pressable onPress={() => setShowAddItem(!showAddItem)} style={styles.addItemBtn}>
            <Ionicons name={showAddItem ? 'close' : 'add'} size={20} color={colors.accent} />
          </Pressable>
        </View>

        {showAddItem && (
          <View style={styles.addItemForm}>
            <View style={styles.addItemRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ITEM_TYPES.map(t => (
                  <Pressable
                    key={t}
                    onPress={() => setNewItemType(t)}
                    style={[styles.typeChip, newItemType === t && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipText, newItemType === t && styles.typeChipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.addItemActions}>
              <Input label="Anzahl" value={newItemQty} onChangeText={setNewItemQty} keyboardType="number-pad" style={{ flex: 1 }} />
              <Button title="Hinzufügen" onPress={handleAddItem} loading={addingItem} size="sm" />
            </View>
          </View>
        )}

        {order.items && order.items.length > 0 ? (
          order.items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.item_type || item.item_type_name || 'Keramik'}</Text>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>
          ))
        ) : (
          <Text style={styles.notes}>Noch keine Werkstücke erfasst</Text>
        )}
      </Card>

      {/* Notizen */}
      {order.notes && (
        <Card>
          <Text style={styles.sectionTitle}>Notizen</Text>
          <Text style={styles.notes}>{order.notes}</Text>
        </Card>
      )}

      {/* Verlauf */}
      {/* Fotos */}
      <Card>
        <Text style={styles.sectionTitle}>Fotos</Text>
        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {photos.map((photo, i) => (
              <Image
                key={photo.key || i}
                source={{ uri: `https://keramik-auszeit.de${photo.url}` }}
                style={{ width: 120, height: 120, borderRadius: 12, marginRight: spacing.sm }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm }}>
            Noch keine Fotos
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable
            onPress={takeAndUploadPhoto}
            disabled={uploading}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10 }}
          >
            {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={18} color="#fff" />}
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: fontSize.sm }}>Kamera</Text>
          </Pressable>
          <Pressable
            onPress={pickAndUploadPhoto}
            disabled={uploading}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.cardBg, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="images" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: fontSize.sm }}>Galerie</Text>
          </Pressable>
        </View>
      </Card>

      {order.status_log && order.status_log.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Verlauf</Text>
          {order.status_log.map((entry, index) => (
            <View key={entry.id} style={[styles.historyEntry, index > 0 && styles.historyBorder]}>
              <View style={styles.historyDot} />
              <View style={styles.historyContent}>
                <Text style={styles.historyStatus}>
                  {entry.old_status ? `${statusLabels[entry.old_status] || entry.old_status} → ` : ''}
                  {statusLabels[entry.new_status] || entry.new_status}
                </Text>
                {entry.note && <Text style={styles.historyNote}>{entry.note}</Text>}
                <Text style={styles.historyMeta}>
                  {new Date(entry.changed_at).toLocaleString('de-DE')}
                  {entry.changed_by && ` · ${entry.changed_by}`}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Status ändern */}
      <Card>
        <Text style={styles.sectionTitle}>Status</Text>
        {/* Fortschrittsanzeige */}
        <View style={styles.statusProgress}>
          {STATUS_FLOW.map((s, i) => {
            const currentIdx = STATUS_FLOW.indexOf(order.overall_status);
            const isDone = i <= currentIdx;
            const isCurrent = s === order.overall_status;
            return (
              <View key={s} style={styles.statusStep}>
                <View style={[styles.statusDot, isDone && styles.statusDotDone, isCurrent && styles.statusDotCurrent]} />
                <Text style={[styles.statusStepText, isCurrent && styles.statusStepTextCurrent]}>
                  {statusLabels[s] || s}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Ofen-Auswahl bei IM_BRENNOFEN */}
        {showOvenPicker && (
          <View style={styles.ovenPicker}>
            <Text style={styles.ovenLabel}>In welchen Ofen?</Text>
            <View style={styles.ovenButtons}>
              {storageLocations.filter(l => l.code.startsWith('Ofen')).map(oven => (
                <Button
                  key={oven.id}
                  title={oven.code}
                  onPress={() => updateStatus('IM_BRENNOFEN', oven.id)}
                  loading={statusChanging}
                  size="lg"
                  style={{ flex: 1 }}
                />
              ))}
            </View>
            <Pressable onPress={() => setShowOvenPicker(false)} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.textLight, fontSize: fontSize.sm }}>Abbrechen</Text>
            </Pressable>
          </View>
        )}

        {/* Fach-Auswahl bei ABHOLBEREIT */}
        {showFachPicker && (
          <View style={styles.ovenPicker}>
            <Text style={styles.ovenLabel}>In welches Fach?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.storageRow}>
                {storageLocations.filter(l => l.code.startsWith('Fach')).map(fach => (
                  <Pressable
                    key={fach.id}
                    onPress={() => updateStatus('ABHOLBEREIT', fach.id)}
                    style={styles.storageChip}
                  >
                    <Text style={styles.storageChipText}>{fach.code}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable onPress={() => setShowFachPicker(false)} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <Text style={{ color: colors.textLight, fontSize: fontSize.sm }}>Abbrechen</Text>
            </Pressable>
          </View>
        )}

        {/* Nächster Status Button */}
        {(() => {
          const currentIdx = STATUS_FLOW.indexOf(order.overall_status);
          const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
          if (!nextStatus || statusChanging || showOvenPicker || showFachPicker) return null;
          return (
            <Button
              title={`→ ${statusLabels[nextStatus]}`}
              onPress={() => updateStatus(nextStatus)}
              loading={statusChanging}
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          );
        })()}
      </Card>

      {/* Abholung */}
      {order.overall_status === 'ABHOLBEREIT' && (
        <Button
          title="Als abgeholt markieren"
          variant="secondary"
          onPress={handlePickup}
          size="lg"
          icon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.text} />}
          style={{ marginTop: spacing.sm }}
        />
      )}

      {/* Meta */}
      <Text style={styles.meta}>
        Erstellt: {new Date(order.created_at).toLocaleString('de-DE')}
      </Text>
    </ScrollView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  refCode: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.brandEspresso, flex: 1, marginRight: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowContent: { flex: 1, marginLeft: spacing.sm },
  label: { fontSize: fontSize.xs, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  subValue: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.brandEspresso, marginBottom: spacing.sm },
  detailGrid: { gap: spacing.sm },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { fontSize: fontSize.md, color: colors.text },
  itemQty: { fontSize: fontSize.sm, color: colors.textSecondary },
  notes: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  historyEntry: { flexDirection: 'row', paddingVertical: spacing.sm },
  historyBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  historyDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 4, marginRight: spacing.sm,
  },
  historyContent: { flex: 1 },
  historyStatus: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  historyNote: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  historyMeta: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 4 },
  ovenPicker: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
  ovenLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.brandEspresso, marginBottom: spacing.sm, textAlign: 'center' },
  ovenButtons: { flexDirection: 'row', gap: spacing.md },
  storageRow: { flexDirection: 'row', gap: spacing.sm },
  storageChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  storageChipActive: { backgroundColor: colors.accent + '20', borderColor: colors.accent },
  storageChipText: { fontSize: fontSize.sm, color: colors.text },
  storageChipTextActive: { color: colors.accent, fontWeight: fontWeight.bold },
  storageInfo: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.sm },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addItemBtn: { padding: spacing.xs },
  addItemForm: { marginBottom: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  addItemRow: { marginBottom: spacing.sm },
  addItemActions: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.xs },
  typeChipActive: { backgroundColor: colors.accent + '20', borderColor: colors.accent },
  typeChipText: { fontSize: fontSize.xs, color: colors.text },
  typeChipTextActive: { color: colors.accent, fontWeight: fontWeight.bold },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBtnActive: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
  },
  statusBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  statusBtnTextActive: {
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  meta: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.md, textAlign: 'center', lineHeight: 18 },
});

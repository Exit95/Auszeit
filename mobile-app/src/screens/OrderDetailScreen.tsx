import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Alert, Image, Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBadge, Card, Button, LoadingScreen } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius, statusLabels } from '../theme';
import type { OrderDetail, RootStackParamList, OrderStatus } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OrderDetail'>;

const STATUS_FLOW: OrderStatus[] = [
  'neu', 'geplant', 'im_ofen', 'gebrannt', 'abholbereit', 'abgeschlossen',
];

export function OrderDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const result = await api.get<OrderDetail>(`/orders/${route.params.id}`);
      setOrder(result);
    } catch (error) {
      console.error('Auftrag laden fehlgeschlagen:', error);
      Alert.alert('Fehler', 'Auftrag konnte nicht geladen werden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder])
  );

  const updateStatus = async (newStatus: OrderStatus) => {
    try {
      await api.patch(`/orders/${route.params.id}/status`, {
        status: newStatus,
        note: `Status geändert zu ${statusLabels[newStatus]}`,
      });
      loadOrder();
    } catch (error) {
      Alert.alert('Fehler', 'Status konnte nicht geändert werden');
    }
  };

  const handleStatusChange = () => {
    if (!order) return;

    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const nextStatus = currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1
      ? STATUS_FLOW[currentIndex + 1]
      : null;

    const options = STATUS_FLOW.filter(s => s !== order.status).map(s => statusLabels[s]);
    options.push('Stornieren');
    options.push('Abbrechen');

    Alert.alert('Status ändern', `Aktuell: ${statusLabels[order.status]}`, [
      ...(nextStatus ? [{
        text: `→ ${statusLabels[nextStatus]}`,
        onPress: () => updateStatus(nextStatus),
      }] : []),
      {
        text: 'Anderer Status...',
        onPress: () => {
          Alert.alert('Status wählen', '', [
            ...STATUS_FLOW.filter(s => s !== order.status).map(s => ({
              text: statusLabels[s],
              onPress: () => updateStatus(s),
            })),
            { text: 'Storniert', style: 'destructive' as const, onPress: () => updateStatus('storniert') },
            { text: 'Abbrechen', style: 'cancel' as const },
          ]);
        },
      },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  };

  const handleAddPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Berechtigung', 'Zugriff auf Fotos wird benötigt');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      try {
        const uris = result.assets.map(a => a.uri);
        await api.uploadImages(route.params.id, uris);
        loadOrder();
      } catch (error) {
        Alert.alert('Fehler', 'Bilder konnten nicht hochgeladen werden');
      }
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Berechtigung', 'Zugriff auf Kamera wird benötigt');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      try {
        await api.uploadImages(route.params.id, [result.assets[0].uri]);
        loadOrder();
      } catch (error) {
        Alert.alert('Fehler', 'Foto konnte nicht hochgeladen werden');
      }
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
        <Text style={styles.title}>{order.title}</Text>
        <Pressable onPress={handleStatusChange}>
          <StatusBadge status={order.status} />
        </Pressable>
      </View>

      {/* Kunde */}
      <Card onPress={() => navigation.navigate('CustomerDetail', { id: order.customer_id })}>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <View style={styles.rowContent}>
            <Text style={styles.label}>Kunde</Text>
            <Text style={styles.value}>{customerName}</Text>
            {order.customer_email && (
              <Text style={styles.subValue}>{order.customer_email}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </View>
      </Card>

      {/* Details */}
      <Card>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailGrid}>
          {order.category && (
            <DetailItem label="Kategorie" value={order.category} />
          )}
          <DetailItem label="Stückzahl" value={order.quantity.toString()} />
          {order.firing_type && (
            <DetailItem label="Brennart" value={order.firing_type} />
          )}
          {order.temperature && (
            <DetailItem label="Temperatur" value={`${order.temperature} °C`} />
          )}
          {order.firing_program && (
            <DetailItem label="Brennprogramm" value={order.firing_program} />
          )}
          {order.kiln_name && (
            <DetailItem label="Ofen" value={order.kiln_name} />
          )}
          {order.desired_date && (
            <DetailItem
              label="Wunschdatum"
              value={new Date(order.desired_date).toLocaleDateString('de-DE')}
            />
          )}
        </View>
      </Card>

      {/* Preis und Bezahlung */}
      <Card>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.label}>Preis</Text>
            <Text style={styles.priceValue}>
              {order.price != null ? `${order.price.toFixed(2)} €` : 'Nicht festgelegt'}
            </Text>
          </View>
          <Pressable
            onPress={async () => {
              try {
                await api.put(`/orders/${order.id}`, {
                  ...order,
                  paid: !order.paid,
                  customer_id: order.customer_id,
                });
                loadOrder();
              } catch (e) {
                Alert.alert('Fehler', 'Status konnte nicht geändert werden');
              }
            }}
            style={[
              styles.paidToggle,
              { backgroundColor: order.paid ? colors.paid + '15' : colors.unpaid + '15' },
            ]}
          >
            <Ionicons
              name={order.paid ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={order.paid ? colors.paid : colors.unpaid}
            />
            <Text style={[styles.paidText, { color: order.paid ? colors.paid : colors.unpaid }]}>
              {order.paid ? 'Bezahlt' : 'Offen'}
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Notizen */}
      {order.notes && (
        <Card>
          <Text style={styles.sectionTitle}>Notizen</Text>
          <Text style={styles.notes}>{order.notes}</Text>
        </Card>
      )}

      {/* Bilder */}
      <Card>
        <View style={styles.imagesHeader}>
          <Text style={styles.sectionTitle}>Bilder</Text>
          <View style={styles.imageActions}>
            <Pressable onPress={handleTakePhoto} style={styles.imageActionBtn}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable onPress={handleAddPhotos} style={styles.imageActionBtn}>
              <Ionicons name="images-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
        </View>
        {order.images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {order.images.map(img => (
              <Image
                key={img.id}
                source={{ uri: api.getImageUrl(img.file_path) }}
                style={styles.image}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noImages}>Noch keine Bilder vorhanden</Text>
        )}
      </Card>

      {/* Historie */}
      {order.history.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Verlauf</Text>
          {order.history.map((entry, index) => (
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
                  {entry.changed_by_name && ` · ${entry.changed_by_name}`}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Aktionen */}
      <View style={styles.actions}>
        <Button
          title="Bearbeiten"
          variant="secondary"
          onPress={() => navigation.navigate('OrderForm', { id: order.id })}
          icon={<Ionicons name="create-outline" size={18} color={colors.text} />}
        />
        <Button
          title="Status ändern"
          onPress={handleStatusChange}
          icon={<Ionicons name="swap-horizontal" size={18} color={colors.textOnPrimary} />}
        />
      </View>

      {/* Meta */}
      <Text style={styles.meta}>
        Erstellt: {new Date(order.created_at).toLocaleString('de-DE')}
        {'\n'}Geändert: {new Date(order.updated_at).toLocaleString('de-DE')}
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
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, flex: 1, marginRight: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowContent: { flex: 1, marginLeft: spacing.sm },
  label: { fontSize: fontSize.xs, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  subValue: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
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
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: 4 },
  paidToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  paidText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  notes: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  imagesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  imageActions: { flexDirection: 'row', gap: spacing.sm },
  imageActionBtn: { padding: spacing.xs },
  imagesScroll: { marginTop: spacing.sm },
  image: { width: 120, height: 120, borderRadius: borderRadius.md, marginRight: spacing.sm },
  noImages: { fontSize: fontSize.sm, color: colors.textLight, fontStyle: 'italic' },
  historyEntry: { flexDirection: 'row', paddingVertical: spacing.sm },
  historyBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  historyDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4, marginRight: spacing.sm,
  },
  historyContent: { flex: 1 },
  historyStatus: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  historyNote: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  historyMeta: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  meta: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.md, textAlign: 'center', lineHeight: 18 },
});

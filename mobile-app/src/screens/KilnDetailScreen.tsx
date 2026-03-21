import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, OrderCard, LoadingScreen, EmptyState } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { KilnDetail, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'KilnDetail'>;

export function KilnDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [kiln, setKiln] = useState<KilnDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadKiln = useCallback(async () => {
    try {
      const result = await api.get<KilnDetail>(`/kilns/${route.params.id}`);
      setKiln(result);
    } catch {
      Alert.alert('Fehler', 'Ofen konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useFocusEffect(useCallback(() => { loadKiln(); }, [loadKiln]));

  if (loading) return <LoadingScreen />;
  if (!kiln) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.kilnIcon}>
          <Ionicons name="flame" size={36} color={colors.accent} />
        </View>
        <Text style={styles.name}>{kiln.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: kiln.active ? colors.success + '15' : colors.textLight + '15' }]}>
          <Text style={[styles.statusText, { color: kiln.active ? colors.success : colors.textLight }]}>
            {kiln.active ? 'Aktiv' : 'Inaktiv'}
          </Text>
        </View>
      </View>

      {/* Details */}
      <Card>
        <Text style={styles.sectionTitle}>Details</Text>
        {kiln.max_temp && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Max. Temperatur</Text>
            <Text style={styles.detailValue}>{kiln.max_temp} °C</Text>
          </View>
        )}
        {kiln.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Beschreibung</Text>
            <Text style={styles.detailValue}>{kiln.description}</Text>
          </View>
        )}
      </Card>

      {/* Aktuelle Belegung */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Aktuell im Ofen ({kiln.currentLoad?.length || 0})
        </Text>
        {kiln.currentLoad?.length > 0 ? (
          kiln.currentLoad.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            />
          ))
        ) : (
          <Card>
            <Text style={styles.emptyText}>Ofen ist leer</Text>
          </Card>
        )}
      </View>

      {/* Verlauf */}
      {kiln.history?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Letzte Brände</Text>
          {kiln.history.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            />
          ))}
        </View>
      )}

      {/* Aktionen */}
      <View style={styles.actions}>
        <Button
          title="Bearbeiten"
          variant="secondary"
          onPress={() => navigation.navigate('KilnForm', { id: kiln.id })}
          icon={<Ionicons name="create-outline" size={18} color={colors.text} />}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', paddingVertical: spacing.lg },
  kilnIcon: {
    width: 72, height: 72, borderRadius: borderRadius.xl,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  section: { marginTop: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  emptyText: { fontSize: fontSize.sm, color: colors.textLight, textAlign: 'center', fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge, OrderCard, LoadingScreen, EmptyState, Button } from '../components';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { DashboardResponse, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await api.get<DashboardResponse>('/dashboard');
      setData(result.data);
    } catch (error) {
      console.error('Dashboard laden fehlgeschlagen:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading && !data) return <LoadingScreen />;

  const c = data?.counters;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            colors={[colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.greeting}>Brennverwaltung</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('de-DE', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
            </View>
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </View>

        <View style={styles.bodyContent}>
          {/* Statistik-Karten */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: colors.statusWartet }]}>
              <Text style={[styles.statNumber, { color: colors.statusWartet }]}>
                {c?.wartet_auf_brennen || 0}
              </Text>
              <Text style={styles.statLabel}>Wartet</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.statusImOfen }]}>
              <Text style={[styles.statNumber, { color: colors.statusImOfen }]}>
                {c?.im_brennofen || 0}
              </Text>
              <Text style={styles.statLabel}>Im Ofen</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.statusAbholbereit }]}>
              <Text style={[styles.statNumber, { color: colors.statusAbholbereit }]}>
                {c?.abholbereit || 0}
              </Text>
              <Text style={styles.statLabel}>Abholbereit</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: colors.statusErfasst }]}>
              <Text style={[styles.statNumber, { color: colors.statusErfasst }]}>
                {c?.erfasst_ohne_lagerort || 0}
              </Text>
              <Text style={styles.statLabel}>Erfasst</Text>
            </View>
          </View>

          {/* Warnungen */}
          {(c?.ueberfaellig || 0) > 0 && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={styles.warningText}>
                {c!.ueberfaellig} überfällige Aufträge
              </Text>
            </View>
          )}

          {/* Neuer Auftrag Button */}
          <Button
            title="Neuer Brennauftrag"
            onPress={() => navigation.navigate('OrderForm', {})}
            size="lg"
            icon={<Ionicons name="add" size={22} color={colors.textOnPrimary} />}
            style={styles.newOrderBtn}
          />

          {/* Nächste Schritte */}
          {(data?.next_steps?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nächste Schritte</Text>
              {data!.next_steps.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
                />
              ))}
            </View>
          )}

          {/* Abholbereit */}
          {(data?.abholbereit_list?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Abholbereit</Text>
              {data!.abholbereit_list.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
                />
              ))}
            </View>
          )}

          {(data?.next_steps?.length ?? 0) === 0 && (data?.abholbereit_list?.length ?? 0) === 0 && (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Alles erledigt!"
              message="Keine offenen Brennaufträge vorhanden."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.brandEspresso,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    backgroundColor: colors.brandEspresso,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  date: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  warningText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  newOrderBtn: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.brandEspresso,
    marginBottom: spacing.sm,
  },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge, OrderCard, LoadingScreen, EmptyState, Button } from '../components';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, fontSize, fontWeight, borderRadius, statusColors } from '../theme';
import type { DashboardData, RootStackParamList, Order } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await api.get<DashboardData>('/orders/dashboard');
      setData(result);
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

  const totalOpen = Object.values(data?.counts || {}).reduce((a, b) => a + b, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hallo, {user?.name}</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Statistik-Karten */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.statusNeu + '15' }]}>
          <Text style={[styles.statNumber, { color: colors.statusNeu }]}>
            {data?.counts?.neu || 0}
          </Text>
          <Text style={styles.statLabel}>Neu</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.statusImOfen + '15' }]}>
          <Text style={[styles.statNumber, { color: colors.statusImOfen }]}>
            {data?.counts?.im_ofen || 0}
          </Text>
          <Text style={styles.statLabel}>Im Ofen</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.statusAbholbereit + '15' }]}>
          <Text style={[styles.statNumber, { color: colors.statusAbholbereit }]}>
            {data?.counts?.abholbereit || 0}
          </Text>
          <Text style={styles.statLabel}>Abholbereit</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {totalOpen}
          </Text>
          <Text style={styles.statLabel}>Gesamt</Text>
        </View>
      </View>

      {/* Neuer Auftrag Button */}
      <Button
        title="Neuer Brennauftrag"
        onPress={() => navigation.navigate('OrderForm', {})}
        size="lg"
        icon={<Ionicons name="add" size={22} color={colors.textOnPrimary} />}
        style={styles.newOrderBtn}
      />

      {/* Heute fällig */}
      {(data?.dueToday?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heute fällig</Text>
          {data!.dueToday.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            />
          ))}
        </View>
      )}

      {/* Neue Aufträge */}
      {(data?.open?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Neue Aufträge</Text>
          {data!.open.slice(0, 5).map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            />
          ))}
        </View>
      )}

      {/* In Bearbeitung */}
      {(data?.inProgress?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In Bearbeitung</Text>
          {data!.inProgress.slice(0, 5).map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            />
          ))}
        </View>
      )}

      {/* Kürzlich abgeschlossen */}
      {(data?.recentDone?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kürzlich fertig</Text>
          {data!.recentDone.slice(0, 3).map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            />
          ))}
        </View>
      )}

      {totalOpen === 0 && (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Alles erledigt!"
          message="Keine offenen Brennaufträge vorhanden."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
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
  newOrderBtn: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});

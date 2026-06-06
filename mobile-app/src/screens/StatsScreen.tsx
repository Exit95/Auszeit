import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../api/adminClient';
import { api } from '../api/client';
import { ScreenHeader, LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Booking, Inquiry, Review, Voucher } from '../types';

interface StatsData {
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  participantsThisMonth: number;
  openInquiries: number;
  voucherCount: number;
  voucherRevenueEur: number; // eingelöste Gutscheine in Euro
  voucherActiveEur: number;  // noch offene (aktive) Gutscheine in Euro
  reviewAvg: number | null;
  reviewCount: number;
  ordersReady: number;
  ordersInProgress: number;
  ordersTotal: number;
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function StatsScreen() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const weekStart = startOfWeekISO();
      const monthStart = startOfMonthISO();

      const [bookingsRes, inquiriesRes, vouchersRes, reviewsRes, brennStatsRes] =
        await Promise.allSettled([
          adminApi.get<Booking[]>('/api/admin/bookings'),
          adminApi.get<Inquiry[]>('/api/inquiries'),
          adminApi.get<Voucher[]>('/api/admin/vouchers'),
          adminApi.get<Review[]>('/api/reviews', { all: 'true' }),
          api.get<any>('/stats'),
        ]);

      let bookingsThisWeek = 0;
      let bookingsThisMonth = 0;
      let participantsThisMonth = 0;
      if (bookingsRes.status === 'fulfilled') {
        const confirmed = bookingsRes.value.filter(
          (b) => b.status === 'confirmed' && b.slotDate,
        );
        bookingsThisWeek = confirmed.filter((b) => (b.slotDate as string) >= weekStart).length;
        const monthly = confirmed.filter((b) => (b.slotDate as string) >= monthStart);
        bookingsThisMonth = monthly.length;
        participantsThisMonth = monthly.reduce((sum, b) => sum + (b.participants || 0), 0);
      }

      let openInquiries = 0;
      if (inquiriesRes.status === 'fulfilled') {
        openInquiries = inquiriesRes.value.filter((i) => i.status === 'new').length;
      }

      let voucherCount = 0;
      let voucherRevenueEur = 0;
      let voucherActiveEur = 0;
      if (vouchersRes.status === 'fulfilled') {
        const vouchers = vouchersRes.value;
        voucherCount = vouchers.length;
        // Betrag ist in Cent gespeichert
        voucherRevenueEur = vouchers
          .filter((v) => v.status === 'redeemed')
          .reduce((sum, v) => sum + (v.amount || 0), 0) / 100;
        voucherActiveEur = vouchers
          .filter((v) => v.status === 'active')
          .reduce((sum, v) => sum + (v.amount || 0), 0) / 100;
      }

      let reviewAvg: number | null = null;
      let reviewCount = 0;
      if (reviewsRes.status === 'fulfilled') {
        const approved = reviewsRes.value.filter((r) => r.approved);
        reviewCount = approved.length;
        if (approved.length > 0) {
          reviewAvg = approved.reduce((sum, r) => sum + (r.rating || 0), 0) / approved.length;
        }
      }

      // Brenn-Aufträge: /stats liefert { gesamt: {...}, abholquote: {...} }
      let ordersReady = 0;
      let ordersInProgress = 0;
      let ordersTotal = 0;
      if (brennStatsRes.status === 'fulfilled') {
        const data = brennStatsRes.value?.data || brennStatsRes.value;
        ordersTotal = Number(data?.gesamt?.auftraege ?? 0);
        ordersReady = Number(data?.abholquote?.wartet_auf_abholung ?? 0);
        const bearbeitet = Number(data?.abholquote?.gesamt_bearbeitet ?? 0);
        const abgeholt = Number(data?.abholquote?.abgeholt ?? 0);
        // "In Arbeit" = bearbeitet minus bereits abgeholt minus abholbereit
        ordersInProgress = Math.max(0, bearbeitet - abgeholt - ordersReady);
      }

      setStats({
        bookingsThisWeek,
        bookingsThisMonth,
        participantsThisMonth,
        openInquiries,
        voucherCount,
        voucherRevenueEur,
        voucherActiveEur,
        reviewAvg,
        reviewCount,
        ordersReady,
        ordersInProgress,
        ordersTotal,
      });
    } catch (error) {
      console.error('Statistiken laden fehlgeschlagen:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !stats) return <LoadingScreen />;

  const fmtEur = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[colors.primary]}
          />
        }
      >
        <ScreenHeader title="Statistiken" subtitle="Überblick im Atelier" icon="bar-chart-outline" />

        <View style={styles.body}>
          {/* Buchungen */}
          <Text style={styles.groupTitle}>Buchungen</Text>
          <View style={styles.grid}>
            <StatTile
              icon="calendar-outline"
              value={String(stats?.bookingsThisWeek ?? 0)}
              label="Diese Woche"
              color={colors.primary}
            />
            <StatTile
              icon="calendar-number-outline"
              value={String(stats?.bookingsThisMonth ?? 0)}
              label="Dieser Monat"
              color={colors.primary}
            />
            <StatTile
              icon="people-outline"
              value={String(stats?.participantsThisMonth ?? 0)}
              label="Plätze / Monat"
              color={colors.info}
            />
            <StatTile
              icon="mail-unread-outline"
              value={String(stats?.openInquiries ?? 0)}
              label="Offene Anfragen"
              color={colors.warning}
            />
          </View>

          {/* Gutscheine */}
          <Text style={styles.groupTitle}>Gutscheine</Text>
          <View style={styles.grid}>
            <StatTile
              icon="cash-outline"
              value={fmtEur(stats?.voucherRevenueEur ?? 0)}
              label="Eingelöst"
              color={colors.success}
            />
            <StatTile
              icon="hourglass-outline"
              value={fmtEur(stats?.voucherActiveEur ?? 0)}
              label="Noch offen"
              color={colors.secondary}
            />
            <StatTile
              icon="gift-outline"
              value={String(stats?.voucherCount ?? 0)}
              label="Verkauft (gesamt)"
              color={colors.primary}
            />
          </View>

          {/* Brennaufträge */}
          <Text style={styles.groupTitle}>Brennaufträge</Text>
          <View style={styles.grid}>
            <StatTile
              icon="checkmark-done-outline"
              value={String(stats?.ordersReady ?? 0)}
              label="Abholbereit"
              color={colors.statusAbholbereit}
            />
            <StatTile
              icon="flame-outline"
              value={String(stats?.ordersInProgress ?? 0)}
              label="In Arbeit"
              color={colors.statusImOfen}
            />
            <StatTile
              icon="albums-outline"
              value={String(stats?.ordersTotal ?? 0)}
              label="Aufträge gesamt"
              color={colors.inkSecondary}
            />
          </View>

          {/* Bewertungen */}
          <Text style={styles.groupTitle}>Bewertungen</Text>
          <View style={styles.reviewCard}>
            <View style={styles.reviewLeft}>
              <Text style={styles.reviewBig}>
                {stats?.reviewAvg != null ? stats.reviewAvg.toFixed(1) : '–'}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={stats?.reviewAvg != null && i <= Math.round(stats.reviewAvg) ? 'star' : 'star-outline'}
                    size={16}
                    color={colors.secondary}
                  />
                ))}
              </View>
            </View>
            <View style={styles.reviewRight}>
              <Text style={styles.reviewCount}>{stats?.reviewCount ?? 0}</Text>
              <Text style={styles.reviewCountLabel}>
                freigegebene Bewertung{(stats?.reviewCount ?? 0) !== 1 ? 'en' : ''}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  icon, value, label, color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.card },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  groupTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.meta,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  tileLabel: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewLeft: { alignItems: 'center', gap: 4 },
  reviewBig: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.ink },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewRight: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
  },
  reviewCount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.ink },
  reviewCountLabel: { fontSize: fontSize.sm, color: colors.inkSecondary },
});

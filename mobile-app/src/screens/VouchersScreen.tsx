import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, TextInput,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { EmptyState, LoadingScreen, FilterChips, ScreenHeader } from '../components';
import type { FilterChip } from '../components';
import { useVouchers } from '../queries/vouchers';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Voucher, VoucherStatus } from '../types';

type FilterKey = VoucherStatus | 'all';

const STATUS_FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'active', label: 'Aktiv' },
  { key: 'redeemed', label: 'Eingelöst' },
  { key: 'expired', label: 'Abgelaufen' },
];

const STATUS_COLORS: Record<VoucherStatus, string> = {
  active: colors.success,
  redeemed: colors.meta,
  expired: colors.error,
};

const STATUS_LABELS: Record<VoucherStatus, string> = {
  active: 'Aktiv',
  redeemed: 'Eingelöst',
  expired: 'Abgelaufen',
};

function filterColor(key: string): string {
  return STATUS_COLORS[key as VoucherStatus] || colors.primary;
}

function formatAmount(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function formatDateTime(isoStr?: string): string {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function VouchersScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Voucher | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { data: vouchers = [], isLoading, isRefetching, refetch, error } = useVouchers();

  const filterChips: FilterChip[] = useMemo(
    () => STATUS_FILTERS.map(f => ({
      key: f.key,
      label: f.label,
      count: f.key === 'all'
        ? vouchers.length
        : vouchers.filter(v => v.status === f.key).length,
    })),
    [vouchers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers
      .filter(v => activeFilter === 'all' || v.status === activeFilter)
      .filter(v => {
        if (!q) return true;
        return (
          v.code.toLowerCase().includes(q) ||
          (v.customerName?.toLowerCase().includes(q) ?? false) ||
          v.customerEmail.toLowerCase().includes(q)
        );
      });
  }, [vouchers, activeFilter, search]);

  const copyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
    } catch {
      // Clipboard nicht verfügbar — still ignorieren
    }
  };

  if (isLoading && vouchers.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Gutscheine" subtitle="Verkaufte Gutscheine" icon="gift" />

      {/* Suchfeld */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.meta} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Code, Name oder E-Mail"
          placeholderTextColor={colors.meta}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Suche löschen">
            <Ionicons name="close-circle" size={18} color={colors.meta} />
          </Pressable>
        )}
      </View>

      <FilterChips
        filters={filterChips}
        activeFilter={activeFilter}
        onSelect={(key) => setActiveFilter(key as FilterKey)}
        getColor={filterColor}
      />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{(error as Error).message}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status];
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => setSelected(item)}
            >
              <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />
              <View style={styles.cardInner}>
                <View style={styles.cardTop}>
                  <Text style={styles.code}>{item.code}</Text>
                  <View style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusChipText, { color: statusColor }]}>
                      {STATUS_LABELS[item.status]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.amount}>{formatAmount(item.amount)}</Text>

                <Text style={styles.detail} numberOfLines={1}>
                  {item.customerName || 'Ohne Namen'}
                </Text>
                <Text style={styles.detailMuted} numberOfLines={1}>{item.customerEmail}</Text>
                <Text style={styles.detailMuted}>Gekauft: {formatDate(item.createdAt)}</Text>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.copyBtn}
                    onPress={() => copyCode(item.code)}
                    hitSlop={6}
                    accessibilityLabel={`Code ${item.code} kopieren`}
                  >
                    <Ionicons
                      name={copiedCode === item.code ? 'checkmark' : 'copy-outline'}
                      size={15}
                      color={colors.primary}
                    />
                    <Text style={styles.copyBtnText}>
                      {copiedCode === item.code ? 'Kopiert' : 'Code kopieren'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="gift-outline"
            title="Keine Gutscheine"
            message={
              search
                ? `Keine Treffer für „${search}"`
                : activeFilter !== 'all'
                  ? `Keine Gutscheine mit Status „${STATUS_LABELS[activeFilter as VoucherStatus]}"`
                  : 'Noch keine Gutscheine verkauft'
            }
          />
        }
      />

      {/* Detail-Modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPress} onPress={() => setSelected(null)} />
          <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
            {selected && (
              <ScrollView contentContainerStyle={styles.modalContent}>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalCode}>{selected.code}</Text>
                  <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[selected.status] + '20' }]}>
                    <Text style={[styles.statusChipText, { color: STATUS_COLORS[selected.status] }]}>
                      {STATUS_LABELS[selected.status]}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.modalCopyBtn}
                  onPress={() => copyCode(selected.code)}
                >
                  <Ionicons
                    name={copiedCode === selected.code ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={colors.textOnPrimary}
                  />
                  <Text style={styles.modalCopyBtnText}>
                    {copiedCode === selected.code ? 'Code kopiert' : 'Code kopieren'}
                  </Text>
                </Pressable>

                <View style={styles.modalRows}>
                  <DetailRow label="Wert" value={formatAmount(selected.amount)} />
                  <DetailRow label="Käufer" value={selected.customerName || 'Ohne Namen'} />
                  <DetailRow label="E-Mail" value={selected.customerEmail} />
                  <DetailRow label="Kaufdatum" value={formatDateTime(selected.createdAt)} />
                  {selected.status === 'redeemed' && (
                    <>
                      <DetailRow label="Eingelöst am" value={formatDateTime(selected.redeemedAt)} />
                      <DetailRow label="Eingelöst von" value={selected.redeemedBy || '—'} />
                      {selected.note ? <DetailRow label="Notiz" value={selected.note} /> : null}
                    </>
                  )}
                </View>

                <Pressable style={styles.modalCloseBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.modalCloseBtnText}>Schließen</Text>
                </Pressable>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  errorBox: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardAccent: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  code: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
  },
  detailMuted: {
    fontSize: fontSize.sm,
    color: colors.meta,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  copyBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(58, 45, 36, 0.45)',
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  modalContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalCode: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  modalCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  modalCopyBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  modalRows: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  detailRowLabel: {
    fontSize: fontSize.sm,
    color: colors.meta,
    flexShrink: 0,
  },
  detailRowValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.ink,
    flex: 1,
    textAlign: 'right',
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCloseBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.inkSecondary,
  },
});

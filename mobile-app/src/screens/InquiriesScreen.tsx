import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../api/adminClient';
import { Card, EmptyState, LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Inquiry, InquiryStatus, InquiryEventType } from '../types';

const EVENT_LABELS: Record<InquiryEventType, string> = {
  kindergeburtstag: 'Kindergeburtstag',
  jga: 'JGA',
  stammtisch: 'Stammtisch',
  firmen_event: 'Firmen-Event',
  privater_anlass: 'Privater Anlass',
  sonstiges: 'Sonstiges',
};

const EVENT_ICONS: Record<InquiryEventType, string> = {
  kindergeburtstag: 'balloon-outline',
  jga: 'heart-outline',
  stammtisch: 'people-outline',
  firmen_event: 'briefcase-outline',
  privater_anlass: 'star-outline',
  sonstiges: 'help-circle-outline',
};

const STATUS_FILTERS: { key: InquiryStatus | 'all'; label: string }[] = [
  { key: 'new', label: 'Offen' },
  { key: 'contacted', label: 'Kontaktiert' },
  { key: 'confirmed', label: 'Bestätigt' },
  { key: 'cancelled', label: 'Abgesagt' },
];

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: colors.warning,
  contacted: colors.info,
  confirmed: colors.success,
  cancelled: colors.error,
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  confirmed: 'Bestätigt',
  cancelled: 'Abgesagt',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Flexibel';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCreatedAt(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function InquiriesScreen() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InquiryStatus | 'all'>('new');
  const [error, setError] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi.get<Inquiry[]>('/api/inquiries');
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const filtered = inquiries
    .filter(i => activeFilter === 'all' || i.status === activeFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/[^0-9+]/g, '');
    const normalized = cleaned.startsWith('0') ? '+49' + cleaned.slice(1) : cleaned;
    const text = encodeURIComponent(`Hallo ${name || ''},\n\nvielen Dank für Ihre Anfrage beim Atelier Auszeit! Ich melde mich gerne wegen Ihrer Veranstaltung.`);
    Linking.openURL(`https://wa.me/${normalized}?text=${text}`);
  };

  if (loading && inquiries.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Filter */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={item => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item: f }) => {
          const count = f.key === 'all'
            ? inquiries.length
            : inquiries.filter(i => i.status === f.key).length;
          const isActive = activeFilter === f.key;
          const color = f.key === 'all' ? colors.primary : STATUS_COLORS[f.key as InquiryStatus];
          return (
            <Pressable
              style={[
                styles.filterChip,
                isActive && { backgroundColor: color + '20', borderColor: color },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[
                styles.filterChipText,
                isActive && { color, fontWeight: fontWeight.semibold },
              ]}>
                {f.label}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        }}
      />

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadInquiries(); }}
            colors={[colors.accent]}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {/* Event-Typ + Status */}
            <View style={styles.cardHeader}>
              <View style={styles.eventBadge}>
                <Ionicons
                  name={(EVENT_ICONS[item.eventType] || 'help-circle-outline') as any}
                  size={14}
                  color={colors.accent}
                />
                <Text style={styles.eventLabel}>
                  {EVENT_LABELS[item.eventType] || item.eventType}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: STATUS_COLORS[item.status] + '20' },
              ]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>

            {/* Name */}
            <Text style={styles.customerName}>{item.name}</Text>

            {/* Details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.textLight} />
                <Text style={styles.detailText}>Wunschdatum: {formatDate(item.preferredDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={13} color={colors.textLight} />
                <Text style={styles.detailText}>{item.participants} Personen</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={13} color={colors.textLight} />
                <Text style={styles.detailText} numberOfLines={1}>{item.email}</Text>
              </View>
              {item.phone && (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={13} color={colors.textLight} />
                  <Text style={styles.detailText}>{item.phone}</Text>
                </View>
              )}
            </View>

            {/* Nachricht */}
            {item.message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText} numberOfLines={3}>{item.message}</Text>
              </View>
            )}

            <Text style={styles.createdAt}>Eingegangen: {formatCreatedAt(item.createdAt)}</Text>

            {/* Aktions-Buttons */}
            <View style={styles.actionRow}>
              {item.phone && (
                <>
                  <Pressable
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => handleCall(item.phone)}
                  >
                    <Ionicons name="call-outline" size={16} color={colors.textOnPrimary} />
                    <Text style={styles.actionBtnText}>Anrufen</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.waBtn]}
                    onPress={() => handleWhatsApp(item.phone, item.name)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color={colors.textOnPrimary} />
                    <Text style={styles.actionBtnText}>WhatsApp</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="mail-open-outline"
            title="Keine Anfragen"
            message={
              activeFilter === 'new'
                ? 'Keine offenen Anfragen vorhanden.'
                : 'Keine Anfragen in dieser Kategorie.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  eventLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailsGrid: {
    gap: 4,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  messageBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  createdAt: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  callBtn: {
    backgroundColor: colors.info,
  },
  waBtn: {
    backgroundColor: '#25D366',
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl, Pressable, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LoadingScreen } from '../components';
import { useInquiries, useUpdateInquiry } from '../queries/inquiries';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Inquiry, InquiryStatus, InquiryEventType, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EVENT_LABELS: Record<InquiryEventType, string> = {
  kindergeburtstag: 'Kindergeburtstag',
  jga: 'JGA',
  stammtisch: 'Stammtisch',
  firmen_event: 'Firmen-Event',
  privater_anlass: 'Privater Anlass',
  sonstiges: 'Sonstiges',
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
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCreatedAt(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

export function InquiriesScreen() {
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<InquiryStatus | 'all'>('new');
  const { data: inquiries = [], isLoading, isRefetching, refetch, error } = useInquiries();
  const updateInquiry = useUpdateInquiry();

  const filtered = useMemo(
    () => inquiries
      .filter(i => activeFilter === 'all' || i.status === activeFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [inquiries, activeFilter],
  );

  const markContacted = (inquiry: Inquiry, via: 'whatsapp' | 'call') => {
    if (inquiry.status !== 'new') return;
    const timestamp = new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    const note = `[${timestamp}] Kontakt via ${via === 'whatsapp' ? 'WhatsApp' : 'Anruf'}`;
    const combinedNotes = inquiry.adminNotes ? `${inquiry.adminNotes}\n${note}` : note;
    updateInquiry.mutate({ id: inquiry.id, status: 'contacted', adminNotes: combinedNotes });
  };

  const handleCall = (inquiry: Inquiry) => {
    if (!inquiry.phone) return;
    Linking.openURL(`tel:${inquiry.phone.replace(/\s+/g, '')}`);
    markContacted(inquiry, 'call');
  };

  const handleWhatsApp = (inquiry: Inquiry) => {
    if (!inquiry.phone) return;
    const cleaned = inquiry.phone.replace(/[^0-9+]/g, '');
    const normalized = cleaned.startsWith('0') ? '+49' + cleaned.slice(1) : cleaned;
    const text = encodeURIComponent(`Hallo ${inquiry.name || ''},\n\nvielen Dank für Ihre Anfrage beim Atelier Auszeit!`);
    Linking.openURL(`https://wa.me/${normalized}?text=${text}`);
    markContacted(inquiry, 'whatsapp');
  };

  if (isLoading && inquiries.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Filter-Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {STATUS_FILTERS.map(f => {
          const count = f.key === 'all'
            ? inquiries.length
            : inquiries.filter(i => i.status === f.key).length;
          const isActive = activeFilter === f.key;
          const color = STATUS_COLORS[f.key as InquiryStatus] || colors.primary;
          return (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {f.label}{count > 0 ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: STATUS_COLORS[item.status] }]} />
            <View style={styles.cardInner}>
              {/* Kopfzeile */}
              <View style={styles.cardTop}>
                <View style={styles.eventChip}>
                  <Text style={styles.eventChipText}>
                    {EVENT_LABELS[item.eventType] || item.eventType}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                  <Text style={[styles.statusChipText, { color: STATUS_COLORS[item.status] }]}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <Text style={styles.name}>{item.name}</Text>

              {/* Details */}
              <Text style={styles.detail}>
                {formatDate(item.preferredDate)} · {item.participants} Personen
              </Text>
              <Text style={styles.detail} numberOfLines={1}>{item.email}</Text>
              {item.phone && <Text style={styles.detail}>{item.phone}</Text>}

              {/* Nachricht */}
              {item.message && (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText} numberOfLines={3}>{item.message}</Text>
                </View>
              )}

              <Text style={styles.createdAt}>Eingegangen: {formatCreatedAt(item.createdAt)}</Text>

              {/* Aktionen */}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('InquiryDetail', { id: item.id })}
                >
                  <Text style={styles.btnText}>Verwalten</Text>
                </Pressable>
                {item.phone && (
                  <>
                    <Pressable
                      style={[styles.btn, { backgroundColor: colors.info }]}
                      onPress={() => handleCall(item)}
                    >
                      <Text style={styles.btnText}>Anrufen</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, { backgroundColor: '#25D366' }]}
                      onPress={() => handleWhatsApp(item)}
                    >
                      <Text style={styles.btnText}>WhatsApp</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="mail-open-outline"
            title="Keine Anfragen"
            message={activeFilter === 'new' ? 'Keine offenen Anfragen.' : 'Keine Anfragen in dieser Kategorie.'}
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
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignSelf: 'center',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.inkSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
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
  cardAccent: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  eventChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
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
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
  },
  messageBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  createdAt: {
    fontSize: fontSize.xs,
    color: colors.meta,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  btnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
});

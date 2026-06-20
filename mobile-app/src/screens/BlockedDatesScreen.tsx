import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, EmptyState } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useBlockedDates, useAddBlockedDate, useDeleteBlockedDate } from '../queries/blockedDates';
import type { BlockedDate } from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatDateHuman(dateStr: string): string {
  if (!DATE_RE.test(dateStr)) return dateStr;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function dayCount(from: string, to: string): number {
  try {
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    const a = new Date(fy, fm - 1, fd).getTime();
    const b = new Date(ty, tm - 1, td).getTime();
    return Math.round((b - a) / 86400000) + 1;
  } catch { return 1; }
}

export function BlockedDatesScreen() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [from, setFrom] = useState(todayString());
  const [to, setTo] = useState(todayString());
  const [reason, setReason] = useState('');

  const { data: items = [], isLoading, isRefetching, error: queryError, refetch } = useBlockedDates();
  const addDate = useAddBlockedDate();
  const deleteDate = useDeleteBlockedDate();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const validate = (): string | null => {
    if (!DATE_RE.test(from)) return 'Von-Datum im Format JJJJ-MM-TT eingeben.';
    if (!DATE_RE.test(to)) return 'Bis-Datum im Format JJJJ-MM-TT eingeben.';
    if (to < from) return 'Bis-Datum muss nach dem Von-Datum liegen.';
    return null;
  };

  const handleAdd = async () => {
    const err = validate();
    if (err) { Alert.alert('Eingabe prüfen', err); return; }
    try {
      await addDate.mutateAsync({ from, to, reason: reason.trim() });
      setReason('');
    } catch (e: any) {
      const status = e?.status ? ` (${e.status})` : '';
      Alert.alert('Speichern fehlgeschlagen' + status, e?.message || 'Bitte erneut versuchen.');
    }
  };

  const handleDelete = (item: BlockedDate) => {
    Alert.alert(
      'Sperrung aufheben',
      `Zeitraum ${formatDateHuman(item.from)} – ${formatDateHuman(item.to)} wieder freigeben?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Freigeben',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await deleteDate.mutateAsync(item.id);
            } catch (err: any) {
              Alert.alert('Fehlgeschlagen', err?.message || 'Bitte erneut versuchen.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
            />
          }
        >
          <ScreenHeader
            title="Urlaub & Sperren"
            subtitle="Zeiträume ohne Buchung"
            icon="airplane-outline"
          />

          {queryError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{(queryError as Error)?.message ?? 'Fehler beim Laden'}</Text>
            </View>
          )}

          {/* Neuer Zeitraum */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Neuer gesperrter Zeitraum</Text>
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Von</Text>
                <TextInput
                  style={styles.input}
                  value={from}
                  onChangeText={setFrom}
                  placeholder="JJJJ-MM-TT"
                  placeholderTextColor={colors.meta}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={10}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Bis</Text>
                <TextInput
                  style={styles.input}
                  value={to}
                  onChangeText={setTo}
                  placeholder="JJJJ-MM-TT"
                  placeholderTextColor={colors.meta}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={10}
                />
              </View>
            </View>
            <View style={styles.quickRow}>
              <Pressable style={styles.quickChip} onPress={() => { setFrom(todayString()); setTo(todayString()); }}>
                <Text style={styles.quickChipText}>Heute</Text>
              </Pressable>
              <Pressable style={styles.quickChip} onPress={() => setTo(addDays(from, 6))}>
                <Text style={styles.quickChipText}>+1 Woche</Text>
              </Pressable>
              <Pressable style={styles.quickChip} onPress={() => setTo(addDays(from, 13))}>
                <Text style={styles.quickChipText}>+2 Wochen</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Grund (optional)</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="z.B. Urlaub, Feiertag"
              placeholderTextColor={colors.meta}
            />
            {DATE_RE.test(from) && DATE_RE.test(to) && to >= from && (
              <Text style={styles.helperText}>
                Sperrt {dayCount(from, to)} Tag{dayCount(from, to) !== 1 ? 'e' : ''} für Online-Buchungen.
              </Text>
            )}

            <Pressable
              style={[styles.addBtn, addDate.isPending && styles.btnDisabled]}
              onPress={handleAdd}
              disabled={addDate.isPending}
            >
              {addDate.isPending ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons name="add" size={18} color={colors.textOnPrimary} />
                  <Text style={styles.addBtnText}>Zeitraum sperren</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Liste */}
          <Text style={styles.listTitle}>Gesperrte Zeiträume</Text>
          {isLoading && items.length === 0 ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
          ) : items.length === 0 ? (
            <EmptyState
              icon="calendar-clear-outline"
              title="Keine Sperrungen"
              message="Lege oben einen Zeitraum an, um Buchungen zu sperren."
            />
          ) : (
            items.map((item) => {
              const isDeleting = deletingId === item.id;
              return (
                <View key={item.id} style={[styles.card, isDeleting && styles.cardDisabled]}>
                  <View style={styles.cardLeft}>
                    <Ionicons name="calendar-clear-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardRange}>
                        {formatDateHuman(item.from)}
                        {item.from !== item.to ? ` – ${formatDateHuman(item.to)}` : ''}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {item.reason ? item.reason : 'Gesperrt'} · {dayCount(item.from, item.to)} Tag
                        {dayCount(item.from, item.to) !== 1 ? 'e' : ''}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => !isDeleting && handleDelete(item)}
                    disabled={isDeleting}
                    accessibilityRole="button"
                    accessibilityLabel="Sperrung aufheben"
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    )}
                  </Pressable>
                </View>
              );
            })
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.card },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.lg },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: { flex: 1, fontSize: fontSize.sm, color: colors.ink },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    margin: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.meta,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.inkSecondary,
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  helperText: { fontSize: fontSize.xs, color: colors.meta },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  quickChip: {
    paddingHorizontal: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: { fontSize: fontSize.xs, color: colors.inkSecondary, fontWeight: fontWeight.semibold },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  addBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textOnPrimary },
  btnDisabled: { opacity: 0.5 },
  listTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cardDisabled: { opacity: 0.5 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  cardRange: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.ink },
  cardMeta: { fontSize: fontSize.sm, color: colors.inkSecondary, marginTop: 2 },
  deleteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '12',
  },
});

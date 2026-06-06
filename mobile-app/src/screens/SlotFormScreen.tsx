import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { adminApi } from '../api/adminClient';
import { LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { TimeSlot, SlotEventType, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SlotForm'>;
type Rt = RouteProp<RootStackParamList, 'SlotForm'>;

const EVENT_OPTIONS: { key: SlotEventType; label: string; icon: string; color: string }[] = [
  { key: 'normal', label: 'Termin', icon: 'calendar-outline', color: colors.primary },
  { key: 'kindergeburtstag', label: 'Kindergeburtstag', icon: 'balloon-outline', color: '#E8A030' },
  { key: 'stammtisch', label: 'Stammtisch', icon: 'people-outline', color: colors.accent },
];

// Validierung
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

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
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

export function SlotFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { id, defaultDate } = route.params || {};
  const isEdit = !!id;

  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(defaultDate || todayString());
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [maxCapacity, setMaxCapacity] = useState('8');
  const [initialBooked, setInitialBooked] = useState('0');
  const [eventType, setEventType] = useState<SlotEventType>('normal');

  // Beim Bearbeiten: bestehenden Slot laden
  const loadExisting = useCallback(async () => {
    if (!id) return;
    try {
      const all = await adminApi.get<TimeSlot[]>('/api/admin/slots');
      const slot = (all || []).find((s) => s.id === id);
      if (!slot) {
        setError('Termin nicht gefunden');
        return;
      }
      setDate(slot.date);
      setStartTime(slot.time || '14:00');
      setEndTime(slot.endTime || '');
      setMaxCapacity(String(slot.maxCapacity));
      setInitialBooked(String(slot.maxCapacity - slot.available));
      setEventType((slot.eventType as SlotEventType) || 'normal');
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
    } finally {
      setLoadingExisting(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) loadExisting();
  }, [isEdit, loadExisting]);

  const validate = (): string | null => {
    if (!DATE_RE.test(date)) return 'Datum im Format JJJJ-MM-TT eingeben (z.B. 2026-05-15)';
    if (!TIME_RE.test(startTime)) return 'Startzeit im Format HH:MM eingeben (z.B. 14:00)';
    if (endTime && !TIME_RE.test(endTime)) return 'Endzeit im Format HH:MM eingeben oder leer lassen';
    if (endTime && endTime <= startTime) return 'Endzeit muss nach der Startzeit liegen';
    const max = parseInt(maxCapacity, 10);
    if (!Number.isFinite(max) || max < 1) return 'Maximale Teilnehmer muss mindestens 1 sein';
    const booked = parseInt(initialBooked || '0', 10);
    if (!Number.isFinite(booked) || booked < 0) return 'Bereits gebucht darf nicht negativ sein';
    if (booked > max) return 'Bereits gebucht darf nicht größer als maximale Teilnehmer sein';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Eingabe prüfen', err);
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        date,
        startTime,
        endTime: endTime || undefined,
        maxCapacity: parseInt(maxCapacity, 10),
        initialBooked: parseInt(initialBooked || '0', 10),
        eventType,
      };
      if (isEdit) {
        payload.id = id;
        await adminApi.put('/api/admin/slots', payload);
      } else {
        await adminApi.post('/api/admin/slots', payload);
      }
      navigation.goBack();
    } catch (e: any) {
      const status = e?.status ? ` (${e.status})` : '';
      Alert.alert(
        'Speichern fehlgeschlagen' + status,
        e?.message || 'Bitte Eingaben prüfen und erneut versuchen.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Datum */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datum</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="JJJJ-MM-TT"
              placeholderTextColor={colors.textLight}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              {DATE_RE.test(date) ? formatDateHuman(date) : 'Format: JJJJ-MM-TT, z.B. 2026-05-15'}
            </Text>
            <View style={styles.quickRow}>
              <Pressable style={styles.quickChip} onPress={() => setDate(todayString())}>
                <Text style={styles.quickChipText}>Heute</Text>
              </Pressable>
              <Pressable style={styles.quickChip} onPress={() => setDate(addDays(todayString(), 1))}>
                <Text style={styles.quickChipText}>+1 Tag</Text>
              </Pressable>
              <Pressable style={styles.quickChip} onPress={() => setDate(addDays(todayString(), 7))}>
                <Text style={styles.quickChipText}>+1 Woche</Text>
              </Pressable>
              <Pressable style={styles.quickChip} onPress={() => setDate(addDays(todayString(), 14))}>
                <Text style={styles.quickChipText}>+2 Wochen</Text>
              </Pressable>
            </View>
          </View>

          {/* Zeit */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uhrzeit</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Start</Text>
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="14:00"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Ende (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="16:00"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={5}
                />
              </View>
            </View>
            <View style={styles.quickRow}>
              {[['14:00', '16:00'], ['10:00', '12:00'], ['18:00', '20:00'], ['15:00', '18:00']].map(([s, e]) => (
                <Pressable
                  key={s + e}
                  style={styles.quickChip}
                  onPress={() => { setStartTime(s); setEndTime(e); }}
                >
                  <Text style={styles.quickChipText}>{s}–{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Kapazität */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plätze</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Maximal</Text>
                <TextInput
                  style={styles.input}
                  value={maxCapacity}
                  onChangeText={(t) => setMaxCapacity(t.replace(/[^0-9]/g, ''))}
                  placeholder="8"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Bereits gebucht</Text>
                <TextInput
                  style={styles.input}
                  value={initialBooked}
                  onChangeText={(t) => setInitialBooked(t.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Text style={styles.helperText}>
              Freie Plätze werden automatisch berechnet:{' '}
              {Math.max(0, (parseInt(maxCapacity, 10) || 0) - (parseInt(initialBooked || '0', 10) || 0))} frei
            </Text>
          </View>

          {/* Event-Typ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Art des Termins</Text>
            <View style={styles.eventGrid}>
              {EVENT_OPTIONS.map((opt) => {
                const isActive = eventType === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.eventTile,
                      isActive && { backgroundColor: opt.color + '18', borderColor: opt.color },
                    ]}
                    onPress={() => setEventType(opt.key)}
                  >
                    <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                    <Text
                      style={[
                        styles.eventTileText,
                        isActive && { color: opt.color, fontWeight: fontWeight.bold },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Speichern */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color={colors.textOnPrimary} />
                  <Text style={styles.actionBtnText}>
                    {isEdit ? 'Änderungen speichern' : 'Termin anlegen'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.md,
    color: colors.text,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  eventGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  eventTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  eventTileText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  saveBtn: { backgroundColor: colors.primary },
  cancelBtn: { backgroundColor: colors.border },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

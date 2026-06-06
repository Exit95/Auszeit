import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  TextInput, KeyboardAvoidingView, Platform, Linking, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { adminApi } from '../api/adminClient';
import { LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Inquiry, InquiryStatus, InquiryEventType, RootStackParamList } from '../types';

type Rt = RouteProp<RootStackParamList, 'InquiryDetail'>;

const EVENT_LABELS: Record<InquiryEventType, string> = {
  kindergeburtstag: 'Kindergeburtstag',
  jga: 'JGA',
  stammtisch: 'Stammtisch',
  firmen_event: 'Firmen-Event',
  privater_anlass: 'Privater Anlass',
  sonstiges: 'Sonstiges',
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  confirmed: 'Bestätigt',
  cancelled: 'Abgesagt',
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: colors.warning,
  contacted: colors.info,
  confirmed: colors.success,
  cancelled: colors.error,
};

const STATUS_ORDER: InquiryStatus[] = ['new', 'contacted', 'confirmed', 'cancelled'];

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
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function buildReplyTemplate(inquiry: Inquiry): string {
  const label = EVENT_LABELS[inquiry.eventType] || inquiry.eventType;
  const dateLine = inquiry.preferredDate
    ? `für deinen Wunschtermin am ${formatDate(inquiry.preferredDate)} `
    : '';
  return `Hallo ${inquiry.name},\n\nvielen Dank für deine Anfrage zum Thema "${label}"!\n\nIch melde mich gerne persönlich ${dateLine}zurück — hier meine Rückmeldung:\n\n[Deine Antwort hier einfügen]\n\nBei Fragen bin ich jederzeit für dich erreichbar.`;
}

export function InquiryDetailScreen() {
  const route = useRoute<Rt>();
  const { id } = route.params;

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing states
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const all = await adminApi.get<Inquiry[]>('/api/inquiries');
      const found = (all || []).find((i) => i.id === id);
      if (!found) {
        setError('Anfrage nicht gefunden');
        return;
      }
      setInquiry(found);
      if (!notesDirty) {
        setNotes(found.adminNotes || '');
      }
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, notesDirty]);

  useEffect(() => {
    load();
  }, [load]);

  const doStatusChange = async (newStatus: InquiryStatus) => {
    if (!inquiry || inquiry.status === newStatus) return;
    setStatusLoading(true);
    try {
      await adminApi.put('/api/inquiries', { id: inquiry.id, status: newStatus });
      await load();
    } catch (err: any) {
      Alert.alert('Fehler', err?.message || 'Status konnte nicht geändert werden');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!inquiry) return;
    setSavingNotes(true);
    try {
      await adminApi.put('/api/inquiries', { id: inquiry.id, adminNotes: notes });
      setNotesDirty(false);
      await load();
      Alert.alert('Gespeichert', 'Notizen wurden aktualisiert.');
    } catch (err: any) {
      Alert.alert('Fehler', err?.message || 'Notizen konnten nicht gespeichert werden');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleOpenReply = () => {
    if (!inquiry) return;
    const label = EVENT_LABELS[inquiry.eventType] || inquiry.eventType;
    setReplySubject(`Antwort auf deine Anfrage: ${label}`);
    setReplyMessage(buildReplyTemplate(inquiry));
    setReplyOpen(true);
  };

  const handleSendReply = async () => {
    if (!inquiry) return;
    if (!replyMessage.trim()) {
      Alert.alert('Leer', 'Bitte eine Nachricht eingeben.');
      return;
    }
    if (replyMessage.includes('[Deine Antwort hier einfügen]')) {
      Alert.alert(
        'Platzhalter',
        'Bitte den Platzhalter "[Deine Antwort hier einfügen]" durch deine Nachricht ersetzen.',
      );
      return;
    }
    setSendingReply(true);
    try {
      await adminApi.post('/api/admin/inquiries/reply', {
        id: inquiry.id,
        subject: replySubject,
        message: replyMessage,
        setStatus: 'contacted',
      });
      setReplyOpen(false);
      setReplyMessage('');
      setNotesDirty(false);
      await load();
      Alert.alert('Gesendet', 'Antwort wurde per E-Mail an den Kunden gesendet.');
    } catch (err: any) {
      Alert.alert('Fehler', err?.message || 'E-Mail konnte nicht gesendet werden');
    } finally {
      setSendingReply(false);
    }
  };

  // Wenn die Anfrage noch "neu" ist: bei Kontaktaufnahme (Mail, Anruf, WhatsApp)
  // automatisch auf "kontaktiert" setzen.
  const markContactedIfNew = async (via: 'whatsapp' | 'call' | 'mail') => {
    if (!inquiry || inquiry.status !== 'new') return;
    try {
      const timestamp = new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
      const viaLabel =
        via === 'whatsapp' ? 'WhatsApp' : via === 'call' ? 'Anruf' : 'Mail-App';
      const note = `[${timestamp}] Kontakt aufgenommen via ${viaLabel}`;
      const combinedNotes = inquiry.adminNotes ? `${inquiry.adminNotes}\n${note}` : note;
      await adminApi.put('/api/inquiries', {
        id: inquiry.id,
        status: 'contacted',
        adminNotes: combinedNotes,
      });
      await load();
    } catch (err) {
      // Nicht-blockierend: Kontaktaufnahme soll immer durchgehen
      console.warn('Status auto-update fehlgeschlagen:', err);
    }
  };

  const handleMailto = () => {
    if (!inquiry) return;
    const subject = replySubject || `Deine Anfrage beim Atelier Auszeit`;
    const body = replyMessage || buildReplyTemplate(inquiry);
    const url = `mailto:${inquiry.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Fehler', 'Kein Mail-Programm verfügbar.');
    });
    markContactedIfNew('mail');
  };

  const handleCall = () => {
    if (!inquiry?.phone) return;
    Linking.openURL(`tel:${inquiry.phone.replace(/\s+/g, '')}`);
    markContactedIfNew('call');
  };

  const handleWhatsApp = () => {
    if (!inquiry?.phone) return;
    const cleaned = inquiry.phone.replace(/[^0-9+]/g, '');
    const normalized = cleaned.startsWith('0') ? '+49' + cleaned.slice(1) : cleaned;
    const text = encodeURIComponent(
      `Hallo ${inquiry.name},\n\nvielen Dank für deine Anfrage beim Atelier Auszeit!`,
    );
    Linking.openURL(`https://wa.me/${normalized.replace('+', '')}?text=${text}`);
    markContactedIfNew('whatsapp');
  };

  const handleCancelInquiry = () => {
    if (!inquiry) return;
    Alert.alert(
      'Anfrage stornieren',
      `Anfrage von ${inquiry.name} als abgesagt markieren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Stornieren',
          style: 'destructive',
          onPress: () => doStatusChange('cancelled'),
        },
      ],
    );
  };

  if (loading && !inquiry) return <LoadingScreen />;

  if (error || !inquiry) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Anfrage nicht gefunden'}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  const label = EVENT_LABELS[inquiry.eventType] || inquiry.eventType;
  const statusColor = STATUS_COLORS[inquiry.status];

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[colors.accent]}
            />
          }
        >
          {/* Header mit Event + Status */}
          <View style={styles.section}>
            <View style={styles.headerRow}>
              <View style={styles.eventChip}>
                <Text style={styles.eventChipText}>{label}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusPillText, { color: statusColor }]}>
                  {STATUS_LABELS[inquiry.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.customerName}>{inquiry.name}</Text>
            <Text style={styles.createdAt}>
              Eingegangen: {formatCreatedAt(inquiry.createdAt)}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Detail icon="calendar-outline" label="Wunschdatum" value={formatDate(inquiry.preferredDate)} />
            <Detail icon="people-outline" label="Personen" value={String(inquiry.participants)} />
            <Detail icon="mail-outline" label="E-Mail" value={inquiry.email} onPress={() => Linking.openURL(`mailto:${inquiry.email}`)} />
            {inquiry.phone && (
              <Detail icon="call-outline" label="Telefon" value={inquiry.phone} onPress={handleCall} />
            )}
          </View>

          {/* Nachricht */}
          {inquiry.message && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nachricht</Text>
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{inquiry.message}</Text>
              </View>
            </View>
          )}

          {/* Status ändern */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status ändern</Text>
            <View style={styles.statusGrid}>
              {STATUS_ORDER.map((s) => {
                const isActive = inquiry.status === s;
                const color = STATUS_COLORS[s];
                return (
                  <Pressable
                    key={s}
                    style={[
                      styles.statusTab,
                      isActive && { backgroundColor: color + '20', borderColor: color },
                      statusLoading && styles.btnDisabled,
                    ]}
                    disabled={statusLoading || isActive}
                    onPress={() => doStatusChange(s)}
                  >
                    {statusLoading && isActive ? (
                      <ActivityIndicator size="small" color={color} />
                    ) : (
                      <Text
                        style={[
                          styles.statusTabText,
                          isActive && { color, fontWeight: fontWeight.bold },
                        ]}
                      >
                        {STATUS_LABELS[s]}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Kommunikations-Aktionen */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kontaktieren</Text>
            <View style={styles.actionGrid}>
              <Pressable style={[styles.actionBtn, styles.replyBtn]} onPress={handleOpenReply}>
                <Ionicons name="mail-outline" size={18} color={colors.textOnPrimary} />
                <Text style={styles.actionBtnText}>Antworten (per App)</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.mailtoBtn]} onPress={handleMailto}>
                <Ionicons name="at-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Mail-App öffnen</Text>
              </Pressable>
            </View>
            {inquiry.phone && (
              <View style={styles.actionGrid}>
                <Pressable style={[styles.actionBtn, styles.callBtn]} onPress={handleCall}>
                  <Ionicons name="call-outline" size={18} color={colors.textOnPrimary} />
                  <Text style={styles.actionBtnText}>Anrufen</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.waBtn]} onPress={handleWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={18} color={colors.textOnPrimary} />
                  <Text style={styles.actionBtnText}>WhatsApp</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Antwort-Editor (inline expandable) */}
          {replyOpen && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Antwort verfassen</Text>
              <Text style={styles.fieldLabel}>Betreff</Text>
              <TextInput
                style={styles.input}
                value={replySubject}
                onChangeText={setReplySubject}
                placeholder="Betreff"
                placeholderTextColor={colors.textLight}
              />
              <Text style={styles.fieldLabel}>Nachricht</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder="Deine persönliche Antwort …"
                placeholderTextColor={colors.textLight}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.replyActions}>
                <Pressable
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => setReplyOpen(false)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Abbrechen</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.sendBtn, sendingReply && styles.btnDisabled]}
                  onPress={handleSendReply}
                  disabled={sendingReply}
                >
                  {sendingReply ? (
                    <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={16} color={colors.textOnPrimary} />
                      <Text style={styles.actionBtnText}>Senden</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Text style={styles.replyHint}>
                Die Antwort wird als E-Mail von atelier@keramik-auszeit.de an {inquiry.email} gesendet und im Protokoll unten gespeichert. Status wird auf „Kontaktiert" gesetzt.
              </Text>
            </View>
          )}

          {/* Notizen */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interne Notizen · Protokoll</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={(t) => { setNotes(t); setNotesDirty(true); }}
              placeholder="Notizen, Absprachen, offene Punkte …"
              placeholderTextColor={colors.textLight}
              multiline
              textAlignVertical="top"
            />
            {notesDirty && (
              <View style={styles.notesActions}>
                <Pressable
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => {
                    setNotes(inquiry.adminNotes || '');
                    setNotesDirty(false);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Verwerfen</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.saveBtn, savingNotes && styles.btnDisabled]}
                  onPress={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? (
                    <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color={colors.textOnPrimary} />
                      <Text style={styles.actionBtnText}>Notizen speichern</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Gefahrenzone */}
          {inquiry.status !== 'cancelled' && (
            <View style={styles.section}>
              <Pressable
                style={[styles.actionBtn, styles.dangerBtn, statusLoading && styles.btnDisabled]}
                onPress={handleCancelInquiry}
                disabled={statusLoading}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>
                  Anfrage stornieren
                </Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Detail({
  icon, label, value, onPress,
}: {
  icon: any; label: string; value: string; onPress?: () => void;
}) {
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap style={styles.detailRow} onPress={onPress}>
      <Ionicons name={icon} size={16} color={colors.textLight} />
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={[styles.detailValue, onPress && styles.detailValueLink]} numberOfLines={1}>
        {value}
      </Text>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventChip: {
    backgroundColor: colors.accent + '18',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  eventChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  createdAt: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
    minWidth: 95,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  detailValueLink: {
    color: colors.info,
    textDecorationLine: 'underline',
  },
  messageBox: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusTab: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  statusTabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  replyBtn: {
    backgroundColor: colors.primary,
  },
  mailtoBtn: {
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  callBtn: {
    backgroundColor: colors.info,
  },
  waBtn: {
    backgroundColor: '#25D366',
  },
  sendBtn: {
    backgroundColor: colors.success,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  cancelBtn: {
    backgroundColor: colors.border,
  },
  dangerBtn: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.md,
    color: colors.text,
  },
  textarea: {
    minHeight: 120,
    paddingTop: 10,
  },
  replyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  replyHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  notesActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

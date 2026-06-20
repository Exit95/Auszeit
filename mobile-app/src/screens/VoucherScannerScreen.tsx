import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, ActivityIndicator,
  TextInput, Vibration, Animated, Keyboard, ScrollView, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../api/adminClient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

interface Voucher {
  code: string;
  amount: number;
  status: 'active' | 'redeemed' | 'expired';
  customerEmail?: string;
  customerName?: string;
  redeemedAt?: string;
  redeemedBy?: string;
}

type ScanState = 'scanning' | 'loading' | 'result' | 'manual';

export function VoucherScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const successAnim = useMemo(() => new Animated.Value(0), []);
  const scannedRef = useRef(false);

  // Reset scanned flag when returning to scanning
  useEffect(() => {
    if (scanState === 'scanning') {
      // Small delay to prevent immediate re-scan
      const timer = setTimeout(() => { scannedRef.current = false; }, 500);
      return () => clearTimeout(timer);
    }
  }, [scanState]);

  function formatCents(cents: number): string {
    return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function extractCode(text: string): string {
    const match = text.match(/einloesen\/([A-Z0-9-]+)/i);
    return match ? match[1] : text.trim();
  }

  async function lookupVoucher(rawCode: string) {
    const code = extractCode(rawCode);
    if (!code) return;

    setScanState('loading');
    setError(null);
    setVoucher(null);

    try {
      const data = await adminApi.post<{ voucher?: Voucher; error?: string }>(
        '/api/admin/vouchers',
        { action: 'lookup', code }
      );
      if (data.voucher) {
        setVoucher(data.voucher);
        setScanState('result');
        Vibration.vibrate(100);
      } else {
        setError(`Gutschein "${code}" nicht gefunden`);
        setScanState('result');
        Vibration.vibrate([0, 50, 50, 50]);
      }
    } catch (err: any) {
      setError(err.message || 'Verbindungsfehler');
      setScanState('result');
    }
  }

  async function redeemVoucher() {
    if (!voucher || redeeming) return;

    Alert.alert(
      'Gutschein einlösen',
      `${voucher.code}\n${formatCents(voucher.amount)}\n\nWirklich einlösen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Einlösen',
          style: 'destructive',
          onPress: async () => {
            setRedeeming(true);
            try {
              const data = await adminApi.post<{ success?: boolean; voucher?: Voucher; error?: string }>(
                '/api/admin/vouchers',
                { action: 'redeem', code: voucher.code }
              );
              if (data.success) {
                Vibration.vibrate([100, 50, 100]);
                setShowSuccess(true);
                Animated.sequence([
                  Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                  Animated.delay(1800),
                  Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]).start(() => {
                  setShowSuccess(false);
                  setVoucher(null);
                  setLastScannedCode(null);
                  setScanState('scanning');
                });
              } else {
                Alert.alert('Fehler', data.error || 'Einlösen fehlgeschlagen');
                if (data.voucher) setVoucher(data.voucher);
              }
            } catch (err: any) {
              Alert.alert('Fehler', err.message || 'Verbindungsfehler');
            } finally {
              setRedeeming(false);
            }
          },
        },
      ]
    );
  }

  function scanAgain() {
    setVoucher(null);
    setError(null);
    setLastScannedCode(null);
    setScanState('scanning');
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scannedRef.current) return;
    const code = extractCode(data);
    if (code === lastScannedCode) return;
    scannedRef.current = true;
    setLastScannedCode(code);
    lookupVoucher(data);
  }

  // Permission screen
  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera" size={48} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Kamera-Zugriff nötig</Text>
          <Text style={styles.permissionText}>
            Um QR-Codes zu scannen, benötigt die App Zugriff auf die Kamera.
          </Text>
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Kamera erlauben</Text>
          </Pressable>
          <Pressable
            style={styles.permissionBtnSecondary}
            onPress={() => setScanState('manual')}
          >
            <Text style={styles.permissionBtnSecondaryText}>Code manuell eingeben</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera / Scanner */}
      {scanState === 'scanning' && (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          {/* Viewfinder overlay */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.overlayHint}>QR-Code in den Rahmen halten</Text>
            </View>
          </View>
        </View>
      )}

      {/* Loading */}
      {scanState === 'loading' && (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Gutschein wird geprüft...</Text>
        </View>
      )}

      {/* Result */}
      {scanState === 'result' && (
        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
          {error ? (
            <View style={styles.resultCard}>
              <View style={[styles.resultIcon, styles.resultIconError]}>
                <Ionicons name="help" size={36} color={colors.error} />
              </View>
              <Text style={[styles.resultStatus, { color: colors.error }]}>NICHT GEFUNDEN</Text>
              <Text style={styles.resultTitle}>Unbekannter Code</Text>
              <Text style={styles.resultError}>{error}</Text>
              <View style={styles.resultActions}>
                <Pressable style={styles.scanAgainBtn} onPress={scanAgain}>
                  <Ionicons name="scan" size={20} color={colors.ink} />
                  <Text style={styles.scanAgainText}>Erneut scannen</Text>
                </Pressable>
              </View>
            </View>
          ) : voucher ? (
            <View style={styles.resultCard}>
              <View style={[
                styles.resultIcon,
                voucher.status === 'active' ? styles.resultIconSuccess :
                voucher.status === 'redeemed' ? styles.resultIconWarning :
                styles.resultIconError
              ]}>
                <Ionicons
                  name={voucher.status === 'active' ? 'checkmark' : voucher.status === 'redeemed' ? 'refresh' : 'close'}
                  size={36}
                  color={voucher.status === 'active' ? colors.success : voucher.status === 'redeemed' ? colors.warning : colors.error}
                />
              </View>

              <Text style={[styles.resultStatus, {
                color: voucher.status === 'active' ? colors.success :
                       voucher.status === 'redeemed' ? colors.warning : colors.error
              }]}>
                {voucher.status === 'active' ? 'GÜLTIG' :
                 voucher.status === 'redeemed' ? 'BEREITS EINGELÖST' : 'ABGELAUFEN'}
              </Text>

              <Text style={styles.resultTitle}>
                {voucher.status === 'active' ? 'Gutschein gültig' :
                 voucher.status === 'redeemed' ? 'Schon verwendet' : 'Nicht mehr gültig'}
              </Text>

              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{voucher.code}</Text>
              </View>

              <Text style={[styles.amountText, {
                color: voucher.status === 'active' ? colors.success : colors.error
              }]}>
                {formatCents(voucher.amount)}
              </Text>

              {voucher.customerEmail ? (
                <Text style={styles.customerText}>
                  {voucher.customerEmail}
                  {voucher.customerName ? ` (${voucher.customerName})` : ''}
                </Text>
              ) : null}

              {voucher.redeemedAt ? (
                <Text style={styles.redeemedText}>
                  Eingelöst: {formatDate(voucher.redeemedAt)}
                  {voucher.redeemedBy ? ` von ${voucher.redeemedBy}` : ''}
                </Text>
              ) : null}

              <View style={styles.resultActions}>
                {voucher.status === 'active' && (
                  <Pressable
                    style={[styles.redeemBtn, redeeming && { opacity: 0.6 }]}
                    onPress={redeemVoucher}
                    disabled={redeeming}
                  >
                    {redeeming ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        <Text style={styles.redeemBtnText}>Jetzt einlösen</Text>
                      </>
                    )}
                  </Pressable>
                )}
                <Pressable style={styles.scanAgainBtn} onPress={scanAgain}>
                  <Ionicons name="scan" size={20} color={colors.ink} />
                  <Text style={styles.scanAgainText}>Nächsten scannen</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Manual input (always at bottom when scanning) */}
      {(scanState === 'scanning' || scanState === 'manual') && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.manualWrap}
        >
          <View style={styles.manualDivider}>
            <View style={styles.manualLine} />
            <Text style={styles.manualLabel}>oder Code eingeben</Text>
            <View style={styles.manualLine} />
          </View>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="AUSZ-XXXX-XXXX"
              placeholderTextColor={colors.meta}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (manualCode.trim()) {
                  Keyboard.dismiss();
                  lookupVoucher(manualCode);
                  setManualCode('');
                }
              }}
            />
            <Pressable
              style={styles.manualBtn}
              onPress={() => {
                if (manualCode.trim()) {
                  Keyboard.dismiss();
                  lookupVoucher(manualCode);
                  setManualCode('');
                }
              }}
            >
              <Ionicons name="search" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Success flash overlay */}
      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: successAnim }]}>
          <Animated.View style={{
            transform: [{
              scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })
            }],
          }}>
            <Ionicons name="checkmark-circle" size={80} color="#fff" />
          </Animated.View>
          <Text style={styles.successText}>Eingelöst!</Text>
          {voucher && <Text style={styles.successAmount}>{formatCents(voucher.amount)}</Text>}
        </Animated.View>
      )}
    </View>
  );
}

const VIEWFINDER_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.inkSecondary,
  },

  // Camera
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Viewfinder overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  overlayHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.sm,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },

  // Permission
  permissionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  permissionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  permissionText: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  permissionBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  permissionBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  permissionBtnSecondary: {
    width: '100%',
    padding: spacing.md,
    alignItems: 'center',
  },
  permissionBtnSecondaryText: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
  },

  // Manual input
  manualWrap: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  manualDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  manualLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  manualLabel: {
    fontSize: fontSize.xs,
    color: colors.meta,
  },
  manualRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Result
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    padding: spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultIconSuccess: { backgroundColor: colors.success + '18' },
  resultIconWarning: { backgroundColor: colors.warning + '18' },
  resultIconError: { backgroundColor: colors.error + '18' },
  resultStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  resultError: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  codeBox: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: fontSize.md,
    letterSpacing: 2,
    color: colors.inkSecondary,
  },
  amountText: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    marginVertical: spacing.sm,
  },
  customerText: {
    fontSize: fontSize.sm,
    color: colors.inkSecondary,
    marginBottom: 4,
  },
  redeemedText: {
    fontSize: fontSize.xs,
    color: colors.meta,
    marginBottom: spacing.sm,
  },
  resultActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 52,
  },
  redeemBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  scanAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
  },
  scanAgainText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },

  // Success flash
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  successText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: '#fff',
    marginTop: spacing.md,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: '#fff',
    marginTop: spacing.sm,
  },
});

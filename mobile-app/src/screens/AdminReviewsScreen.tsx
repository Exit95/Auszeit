import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../api/adminClient';
import { Card, EmptyState, LoadingScreen } from '../components';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { Review } from '../types';

type Filter = 'pending' | 'approved';

function formatDate(isoStr: string): string {
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

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#E8A030' : colors.border}
        />
      ))}
      <Text style={starStyles.ratingText}>{rating}/5</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});

export function AdminReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi.get<Review[]>('/api/reviews', { all: 'true' });
      setReviews(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filtered = reviews
    .filter(r => activeFilter === 'pending' ? !r.approved : r.approved)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingCount = reviews.filter(r => !r.approved).length;
  const approvedCount = reviews.filter(r => r.approved).length;

  const handleApprove = async (review: Review) => {
    setActionLoading(review.id);
    try {
      await adminApi.patch('/api/reviews', { id: review.id, approved: true });
      await loadReviews();
    } catch (err: any) {
      Alert.alert('Fehler', err?.message || 'Freigabe fehlgeschlagen');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (review: Review) => {
    Alert.alert(
      'Bewertung ablehnen',
      `Bewertung von ${review.name} ablehnen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ablehnen',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(review.id);
            try {
              await adminApi.patch('/api/reviews', { id: review.id, approved: false });
              await loadReviews();
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Ablehnen fehlgeschlagen');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (review: Review) => {
    Alert.alert(
      'Bewertung löschen',
      `Bewertung von ${review.name} dauerhaft löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(review.id);
            try {
              await adminApi.delete('/api/reviews', { id: review.id });
              await loadReviews();
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Löschen fehlgeschlagen');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  if (loading && reviews.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterTab,
            activeFilter === 'pending' && { backgroundColor: colors.warning + '20', borderColor: colors.warning },
          ]}
          onPress={() => setActiveFilter('pending')}
        >
          <Text style={[
            styles.filterLabel,
            activeFilter === 'pending' && { color: colors.warning, fontWeight: fontWeight.semibold },
          ]}>
            Ausstehend
          </Text>
          {pendingCount > 0 && (
            <View style={[
              styles.filterBadge,
              { backgroundColor: activeFilter === 'pending' ? colors.warning : colors.border },
            ]}>
              <Text style={[
                styles.filterBadgeText,
                activeFilter === 'pending' && { color: colors.textOnPrimary },
              ]}>
                {pendingCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.filterTab,
            activeFilter === 'approved' && { backgroundColor: colors.success + '20', borderColor: colors.success },
          ]}
          onPress={() => setActiveFilter('approved')}
        >
          <Text style={[
            styles.filterLabel,
            activeFilter === 'approved' && { color: colors.success, fontWeight: fontWeight.semibold },
          ]}>
            Freigegeben
          </Text>
          {approvedCount > 0 && (
            <View style={[
              styles.filterBadge,
              { backgroundColor: activeFilter === 'approved' ? colors.success : colors.border },
            ]}>
              <Text style={[
                styles.filterBadgeText,
                activeFilter === 'approved' && { color: colors.textOnPrimary },
              ]}>
                {approvedCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

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
            onRefresh={() => { setRefreshing(true); loadReviews(); }}
            colors={[colors.accent]}
          />
        }
        renderItem={({ item }) => {
          const isProcessing = actionLoading === item.id;
          return (
            <Card style={[styles.card, isProcessing && styles.cardDisabled]}>
              {/* Header: Name + Datum */}
              <View style={styles.cardHeader}>
                <Text style={styles.reviewerName}>{item.name}</Text>
                <Text style={styles.reviewDate}>{formatDate(item.date)}</Text>
              </View>

              {/* Sterne */}
              <View style={styles.ratingRow}>
                <StarRating rating={item.rating} />
              </View>

              {/* Kommentar */}
              <View style={styles.commentBox}>
                <Text style={styles.commentText}>{item.comment}</Text>
              </View>

              {/* Aktionen */}
              <View style={styles.actionRow}>
                {activeFilter === 'pending' ? (
                  <>
                    <Pressable
                      style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.btnDisabled]}
                      onPress={() => !isProcessing && handleApprove(item)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.textOnPrimary} />
                      <Text style={styles.actionBtnText}>Freigeben</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.deleteBtn, isProcessing && styles.btnDisabled]}
                      onPress={() => !isProcessing && handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text style={[styles.actionBtnText, { color: colors.error }]}>Löschen</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.btnDisabled]}
                      onPress={() => !isProcessing && handleReject(item)}
                    >
                      <Ionicons name="eye-off-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Verstecken</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.deleteBtn, isProcessing && styles.btnDisabled]}
                      onPress={() => !isProcessing && handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text style={[styles.actionBtnText, { color: colors.error }]}>Löschen</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={activeFilter === 'pending' ? 'checkmark-done-circle-outline' : 'star-outline'}
            title={activeFilter === 'pending' ? 'Keine ausstehenden Bewertungen' : 'Noch keine freigegebenen Bewertungen'}
            message={
              activeFilter === 'pending'
                ? 'Alle Bewertungen wurden bearbeitet.'
                : 'Freigegebene Bewertungen erscheinen auf der Website.'
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
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
  cardDisabled: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  reviewerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewDate: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  ratingRow: {
    marginBottom: spacing.sm,
  },
  commentBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  commentText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
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
  approveBtn: {
    backgroundColor: colors.success,
  },
  rejectBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteBtn: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
});

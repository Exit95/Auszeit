import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, LoadingScreen, FilterChips, ScreenHeader } from '../components';
import type { FilterChip } from '../components/FilterChips';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useReviews, useApproveReview, useRejectReview, useDeleteReview } from '../queries/reviews';
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
          color={i <= rating ? colors.secondary : colors.border}
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
    color: colors.inkSecondary,
    marginLeft: 4,
  },
});

export function AdminReviewsScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: reviews = [], isLoading, isRefetching, error: queryError, refetch } = useReviews();
  const approve = useApproveReview();
  const reject = useRejectReview();
  const deleteReview = useDeleteReview();

  const filtered = reviews
    .filter(r => activeFilter === 'pending' ? !r.approved : r.approved)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingCount = reviews.filter(r => !r.approved).length;
  const approvedCount = reviews.filter(r => r.approved).length;

  const handleApprove = useCallback(async (review: Review) => {
    setActionLoading(review.id);
    try {
      await approve.mutateAsync(review.id);
    } catch (err: any) {
      Alert.alert('Fehler', err?.message || 'Freigabe fehlgeschlagen');
    } finally {
      setActionLoading(null);
    }
  }, [approve]);

  const handleReject = useCallback(async (review: Review) => {
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
              await reject.mutateAsync(review.id);
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Ablehnen fehlgeschlagen');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [reject]);

  const handleDelete = useCallback(async (review: Review) => {
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
              await deleteReview.mutateAsync(review.id);
            } catch (err: any) {
              Alert.alert('Fehler', err?.message || 'Löschen fehlgeschlagen');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [deleteReview]);

  const reviewFilterChips: FilterChip[] = [
    { key: 'pending', label: 'Ausstehend', count: pendingCount },
    { key: 'approved', label: 'Freigegeben', count: approvedCount },
  ];

  const reviewFilterColors: Record<string, string> = {
    pending: colors.warning,
    approved: colors.success,
  };

  const renderReviewItem = useCallback(({ item }: { item: Review }) => {
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
                <Ionicons name="eye-off-outline" size={16} color={colors.inkSecondary} />
                <Text style={[styles.actionBtnText, { color: colors.inkSecondary }]}>Verstecken</Text>
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
  }, [actionLoading, activeFilter, handleApprove, handleReject, handleDelete]);

  if (isLoading && reviews.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bewertungen" subtitle="Kundenbewertungen" icon="star-outline" />
      <FilterChips
        filters={reviewFilterChips}
        activeFilter={activeFilter}
        onSelect={key => setActiveFilter(key as Filter)}
        getColor={key => reviewFilterColors[key] ?? colors.primary}
        variant="tabs"
      />

      {queryError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.errorText}>{(queryError as Error)?.message ?? 'Fehler beim Laden'}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
        renderItem={renderReviewItem}
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
    color: colors.ink,
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
    color: colors.ink,
  },
  reviewDate: {
    fontSize: fontSize.xs,
    color: colors.meta,
  },
  ratingRow: {
    marginBottom: spacing.sm,
  },
  commentBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  commentText: {
    fontSize: fontSize.sm,
    color: colors.ink,
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
    backgroundColor: colors.card,
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

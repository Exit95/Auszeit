import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

export interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  filters: FilterChip[];
  activeFilter: string;
  onSelect: (key: string) => void;
  /** Optionale Status-Farbe pro Filter (z. B. Grün für „aktiv"). Default: terra/primary. */
  getColor?: (key: string) => string;
}

/**
 * Horizontale Filterleiste als ScrollView (kein FlatList — Design-Regel der App).
 * Gemeinsam genutzt von Orders-, Inquiries- und Vouchers-Screen.
 * Aktiver Chip wird in seiner Status-Farbe (getColor) bzw. terra eingefärbt.
 */
export function FilterChips({ filters, activeFilter, onSelect, getColor }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {filters.map((f) => {
        const isActive = activeFilter === f.key;
        const color = getColor ? getColor(f.key) : colors.primary;
        const hasCount = typeof f.count === 'number' && f.count > 0;
        return (
          <Pressable
            key={f.key}
            onPress={() => onSelect(f.key)}
            style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={hasCount ? `${f.label}, ${f.count}` : f.label}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {f.label}{hasCount ? ` (${f.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
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
});

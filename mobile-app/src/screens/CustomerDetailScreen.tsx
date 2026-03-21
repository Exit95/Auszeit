import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Alert, Linking,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, OrderCard, LoadingScreen, EmptyState } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight } from '../theme';
import type { Customer, Order, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CustomerDetail'>;

export function CustomerDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [customerData, ordersData] = await Promise.all([
        api.get<Customer>(`/customers/${route.params.id}`),
        api.get<Order[]>(`/customers/${route.params.id}/orders`),
      ]);
      setCustomer(customerData);
      setOrders(ordersData);
    } catch (error) {
      Alert.alert('Fehler', 'Kundendaten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleDelete = () => {
    Alert.alert('Kunde löschen', 'Diesen Kunden wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/customers/${route.params.id}`);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Fehler', 'Kunde konnte nicht gelöscht werden. Möglicherweise existieren noch Aufträge.');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!customer) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Kundendaten */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {customer.first_name[0]}{customer.last_name[0]}
          </Text>
        </View>
        <Text style={styles.name}>{customer.first_name} {customer.last_name}</Text>
      </View>

      {/* Kontaktdaten */}
      <Card>
        <Text style={styles.sectionTitle}>Kontakt</Text>
        {customer.email && (
          <ContactRow
            icon="mail-outline"
            value={customer.email}
            onPress={() => Linking.openURL(`mailto:${customer.email}`)}
          />
        )}
        {customer.phone && (
          <ContactRow
            icon="call-outline"
            value={customer.phone}
            onPress={() => Linking.openURL(`tel:${customer.phone}`)}
          />
        )}
        {!customer.email && !customer.phone && (
          <Text style={styles.noData}>Keine Kontaktdaten hinterlegt</Text>
        )}
      </Card>

      {/* Notizen */}
      {customer.notes && (
        <Card>
          <Text style={styles.sectionTitle}>Notizen</Text>
          <Text style={styles.notes}>{customer.notes}</Text>
        </Card>
      )}

      {/* Aufträge */}
      <View style={styles.ordersSection}>
        <View style={styles.ordersHeader}>
          <Text style={styles.sectionTitle}>Brennaufträge ({orders.length})</Text>
          <Button
            title="Neuer Auftrag"
            size="sm"
            onPress={() => navigation.navigate('OrderForm', { customerId: customer.id })}
          />
        </View>

        {orders.length > 0 ? (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => navigation.navigate('OrderDetail', { id: order.id })}
            />
          ))
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="Keine Aufträge"
            message="Noch keine Brennaufträge für diesen Kunden"
          />
        )}
      </View>

      {/* Aktionen */}
      <View style={styles.actions}>
        <Button
          title="Bearbeiten"
          variant="secondary"
          onPress={() => navigation.navigate('CustomerForm', { id: customer.id })}
          icon={<Ionicons name="create-outline" size={18} color={colors.text} />}
        />
        <Button
          title="Löschen"
          variant="danger"
          onPress={handleDelete}
          icon={<Ionicons name="trash-outline" size={18} color="#fff" />}
        />
      </View>

      <Text style={styles.meta}>
        Erstellt: {new Date(customer.created_at).toLocaleDateString('de-DE')}
      </Text>
    </ScrollView>
  );
}

function ContactRow({ icon, value, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.contactRow}>
      <View style={styles.contactContent}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.contactValue}>{value}</Text>
        <Ionicons name="open-outline" size={16} color={colors.textLight} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.md },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.primary },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
  contactRow: { marginBottom: spacing.xs, padding: spacing.sm },
  contactContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactValue: { flex: 1, fontSize: fontSize.md, color: colors.text },
  noData: { fontSize: fontSize.sm, color: colors.textLight, fontStyle: 'italic' },
  notes: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  ordersSection: { marginTop: spacing.md },
  ordersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  meta: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.md, textAlign: 'center' },
});

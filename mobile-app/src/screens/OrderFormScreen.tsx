import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, LoadingScreen } from '../components';
import { api } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { RootStackParamList, Customer } from '../types';

type Nav = import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OrderForm'>;

export function OrderFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isEdit = !!route.params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [customerId, setCustomerId] = useState<number | null>(route.params?.customerId || null);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemType, setItemType] = useState('Sonstiges');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const custResult = await api.get<any>('/customers');
      const custList = custResult?.data?.customers || [];
      setCustomers(custList);

      if (isEdit) {
        const orderResult = await api.get<any>(`/orders/${route.params.id}`);
        const order = orderResult?.data?.order || orderResult?.data;
        if (order) {
          setCustomerId(order.customer_id);
          setVisitDate(order.visit_date?.split('T')[0] || visitDate);
          setNotes(order.notes || '');
          const items = orderResult?.data?.items || [];
          if (items.length > 0) {
            setItemType(items[0].item_type || 'Sonstiges');
            setQuantity(String(items[0].quantity || 1));
          }
        }
      }
    } catch (error) {
      console.error('Daten laden fehlgeschlagen:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [isEdit, route.params?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSave = async () => {
    if (!customerId) {
      Alert.alert('Fehler', 'Bitte einen Kunden auswählen');
      return;
    }

    setSaving(true);
    try {
      const body = {
        customer_id: customerId,
        visit_date: visitDate,
        notes: notes.trim() || null,
        items: [{
          item_type: itemType,
          quantity: parseInt(quantity) || 1,
        }],
      };

      if (isEdit) {
        await api.put(`/orders/${route.params.id}`, body);
      } else {
        await api.post('/orders', body);
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Kunde</Text>
      {selectedCustomer ? (
        <Pressable onPress={() => setCustomerId(null)} style={styles.selectedCustomer}>
          <Text style={styles.selectedName}>
            {selectedCustomer.first_name} {selectedCustomer.last_name}
          </Text>
          <Ionicons name="close-circle" size={20} color={colors.textLight} />
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerList}>
          {customers.map(c => (
            <Pressable key={c.id} onPress={() => setCustomerId(c.id)} style={styles.customerChip}>
              <Text style={styles.customerChipText}>{c.first_name} {c.last_name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Input label="Besuchsdatum" value={visitDate} onChangeText={setVisitDate} placeholder="YYYY-MM-DD" />
      <Input label="Werkstück-Typ" value={itemType} onChangeText={setItemType} placeholder="z.B. Tasse, Teller" />
      <Input label="Anzahl" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="1" />
      <Input label="Notizen" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

      <Button
        title={isEdit ? 'Speichern' : 'Auftrag erstellen'}
        onPress={handleSave}
        loading={saving}
        size="lg"
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  selectedCustomer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary + '15', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  selectedName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.brandEspresso },
  customerList: { marginBottom: spacing.sm },
  customerChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full, marginRight: spacing.sm },
  customerChipText: { fontSize: fontSize.sm, color: colors.text },
  saveBtn: { marginTop: spacing.lg },
});

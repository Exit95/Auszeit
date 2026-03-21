import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Switch, Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../components';
import { api, ApiError } from '../api/client';
import { colors, spacing, fontSize, fontWeight, borderRadius, statusLabels } from '../theme';
import type { RootStackParamList, Customer, Kiln, OrderDetail, OrderStatus } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OrderForm'>;

const CATEGORIES = ['Tasse', 'Teller', 'Schale', 'Figur', 'Spardose', 'Anhänger', 'Sonstiges'];
const FIRING_TYPES = ['Schrühbrand', 'Glasurbrand', 'Dekorbrand', 'Raku'];
const STATUSES: OrderStatus[] = ['neu', 'geplant', 'im_ofen', 'gebrannt', 'abholbereit', 'abgeschlossen', 'storniert'];

export function OrderFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isEdit = !!route.params?.id;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [kilns, setKilns] = useState<Kiln[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formularfelder
  const [customerId, setCustomerId] = useState<number | null>(route.params?.customerId || null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [firingType, setFiringType] = useState('');
  const [temperature, setTemperature] = useState('');
  const [firingProgram, setFiringProgram] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [status, setStatus] = useState<OrderStatus>('neu');
  const [kilnId, setKilnId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, kilnsData] = await Promise.all([
        api.get<Customer[]>('/customers'),
        api.get<Kiln[]>('/kilns'),
      ]);
      setCustomers(customersData);
      setKilns(kilnsData);

      if (isEdit) {
        const order = await api.get<OrderDetail>(`/orders/${route.params.id}`);
        setCustomerId(order.customer_id);
        setTitle(order.title);
        setCategory(order.category || '');
        setQuantity(order.quantity.toString());
        setFiringType(order.firing_type || '');
        setTemperature(order.temperature?.toString() || '');
        setFiringProgram(order.firing_program || '');
        setDesiredDate(order.desired_date || '');
        setStatus(order.status);
        setKilnId(order.kiln_id);
        setNotes(order.notes || '');
        setPrice(order.price?.toString() || '');
        setPaid(order.paid);
      }
    } catch (error) {
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customerId) {
      Alert.alert('Fehler', 'Bitte einen Kunden auswählen');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte eine Bezeichnung eingeben');
      return;
    }

    setSaving(true);
    try {
      const data = {
        customer_id: customerId,
        kiln_id: kilnId,
        title: title.trim(),
        category: category || undefined,
        quantity: parseInt(quantity) || 1,
        firing_type: firingType || undefined,
        temperature: temperature ? parseInt(temperature) : null,
        firing_program: firingProgram || undefined,
        desired_date: desiredDate || undefined,
        status,
        notes: notes || undefined,
        price: price ? parseFloat(price) : null,
        paid,
      };

      if (isEdit) {
        await api.put(`/orders/${route.params.id}`, data);
      } else {
        await api.post('/orders', data);
      }

      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Fehler', error.message);
      } else {
        Alert.alert('Fehler', 'Auftrag konnte nicht gespeichert werden');
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === customerId);
  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Kunde</Text>

      {/* Kundenauswahl */}
      <Pressable
        onPress={() => setShowCustomerPicker(!showCustomerPicker)}
        style={styles.pickerButton}
      >
        <Text style={selectedCustomer ? styles.pickerValue : styles.pickerPlaceholder}>
          {selectedCustomer
            ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
            : 'Kunde auswählen...'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textLight} />
      </Pressable>

      {showCustomerPicker && (
        <View style={styles.pickerDropdown}>
          <Input
            label=""
            placeholder="Suchen..."
            value={customerSearch}
            onChangeText={setCustomerSearch}
          />
          <ScrollView style={styles.pickerList} nestedScrollEnabled>
            {filteredCustomers.map(c => (
              <Pressable
                key={c.id}
                onPress={() => { setCustomerId(c.id); setShowCustomerPicker(false); setCustomerSearch(''); }}
                style={[styles.pickerItem, c.id === customerId && styles.pickerItemActive]}
              >
                <Text style={styles.pickerItemText}>
                  {c.first_name} {c.last_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionTitle}>Werkstück</Text>

      <Input label="Bezeichnung *" value={title} onChangeText={setTitle} placeholder="z.B. Tasse mit Herz" />

      {/* Kategorie-Chips */}
      <Text style={styles.chipLabel}>Kategorie</Text>
      <View style={styles.chips}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            onPress={() => setCategory(category === cat ? '' : cat)}
            style={[styles.chip, category === cat && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </Pressable>
        ))}
      </View>

      <Input label="Stückzahl" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />

      <Text style={styles.sectionTitle}>Brennen</Text>

      {/* Brennart-Chips */}
      <Text style={styles.chipLabel}>Brennart</Text>
      <View style={styles.chips}>
        {FIRING_TYPES.map(ft => (
          <Pressable
            key={ft}
            onPress={() => setFiringType(firingType === ft ? '' : ft)}
            style={[styles.chip, firingType === ft && styles.chipActive]}
          >
            <Text style={[styles.chipText, firingType === ft && styles.chipTextActive]}>{ft}</Text>
          </Pressable>
        ))}
      </View>

      <Input label="Temperatur (°C)" value={temperature} onChangeText={setTemperature} keyboardType="number-pad" placeholder="z.B. 1050" />
      <Input label="Brennprogramm" value={firingProgram} onChangeText={setFiringProgram} placeholder="z.B. P3" />

      {/* Ofen-Auswahl */}
      <Text style={styles.chipLabel}>Ofen</Text>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setKilnId(null)}
          style={[styles.chip, kilnId === null && styles.chipActive]}
        >
          <Text style={[styles.chipText, kilnId === null && styles.chipTextActive]}>Keiner</Text>
        </Pressable>
        {kilns.filter(k => k.active).map(kiln => (
          <Pressable
            key={kiln.id}
            onPress={() => setKilnId(kiln.id)}
            style={[styles.chip, kilnId === kiln.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, kilnId === kiln.id && styles.chipTextActive]}>{kiln.name}</Text>
          </Pressable>
        ))}
      </View>

      <Input label="Wunschdatum" value={desiredDate} onChangeText={setDesiredDate} placeholder="JJJJ-MM-TT" />

      {/* Status */}
      <Text style={styles.chipLabel}>Status</Text>
      <View style={styles.chips}>
        {STATUSES.map(s => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={[styles.chip, status === s && styles.chipActive]}
          >
            <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{statusLabels[s]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Preis & Bezahlung</Text>
      <Input label="Preis (€)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Bezahlt</Text>
        <Switch
          value={paid}
          onValueChange={setPaid}
          trackColor={{ false: colors.border, true: colors.paid + '60' }}
          thumbColor={paid ? colors.paid : '#f4f3f4'}
        />
      </View>

      <Text style={styles.sectionTitle}>Notizen</Text>
      <Input
        label="Notizen"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        style={{ height: 100, textAlignVertical: 'top' }}
        placeholder="Besonderheiten, Hinweise..."
      />

      {/* Speichern */}
      <View style={styles.actions}>
        <Button title="Abbrechen" variant="secondary" onPress={() => navigation.goBack()} />
        <Button
          title={isEdit ? 'Speichern' : 'Erstellen'}
          onPress={handleSave}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  chipLabel: {
    fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: '600' },
  pickerButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  pickerValue: { fontSize: fontSize.md, color: colors.text },
  pickerPlaceholder: { fontSize: fontSize.md, color: colors.textLight },
  pickerDropdown: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.md,
  },
  pickerList: { maxHeight: 200 },
  pickerItem: { paddingVertical: 10, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
  pickerItemActive: { backgroundColor: colors.primary + '15' },
  pickerItemText: { fontSize: fontSize.md, color: colors.text },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: fontSize.md, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
});

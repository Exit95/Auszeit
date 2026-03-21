import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input, Button } from '../components';
import { api, ApiError } from '../api/client';
import { colors, spacing, fontSize, fontWeight } from '../theme';
import type { RootStackParamList, Customer } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CustomerForm'>;

export function CustomerFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isEdit = !!route.params?.id;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadCustomer();
    }
  }, []);

  const loadCustomer = async () => {
    try {
      const customer = await api.get<Customer>(`/customers/${route.params.id}`);
      setFirstName(customer.first_name);
      setLastName(customer.last_name);
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setNotes(customer.notes || '');
    } catch {
      Alert.alert('Fehler', 'Kundendaten konnten nicht geladen werden');
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Fehler', 'Vor- und Nachname sind erforderlich');
      return;
    }

    setSaving(true);
    try {
      const data = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      };

      if (isEdit) {
        await api.put(`/customers/${route.params.id}`, data);
      } else {
        await api.post('/customers', data);
      }
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Fehler', error.message);
      } else {
        Alert.alert('Fehler', 'Kunde konnte nicht gespeichert werden');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input label="Vorname *" value={firstName} onChangeText={setFirstName} placeholder="Vorname" autoFocus />
      <Input label="Nachname *" value={lastName} onChangeText={setLastName} placeholder="Nachname" />
      <Input label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="email@beispiel.de" />
      <Input label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+49 123 456789" />
      <Input
        label="Notizen"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        style={{ height: 100, textAlignVertical: 'top' }}
        placeholder="Anmerkungen zum Kunden..."
      />

      <Button
        title={isEdit ? 'Speichern' : 'Anlegen'}
        onPress={handleSave}
        loading={saving}
        size="lg"
        style={styles.saveButton}
      />
      <Button title="Abbrechen" variant="ghost" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  saveButton: { marginTop: spacing.lg },
});

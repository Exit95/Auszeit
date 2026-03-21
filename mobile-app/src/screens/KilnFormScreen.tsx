import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, View, Text, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input, Button } from '../components';
import { api, ApiError } from '../api/client';
import { colors, spacing, fontSize } from '../theme';
import type { RootStackParamList, Kiln } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'KilnForm'>;

export function KilnFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isEdit = !!route.params?.id;

  const [name, setName] = useState('');
  const [maxTemp, setMaxTemp] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadKiln();
    }
  }, []);

  const loadKiln = async () => {
    try {
      const kiln = await api.get<Kiln>(`/kilns/${route.params.id}`);
      setName(kiln.name);
      setMaxTemp(kiln.max_temp?.toString() || '');
      setDescription(kiln.description || '');
      setActive(kiln.active);
    } catch {
      Alert.alert('Fehler', 'Ofen konnte nicht geladen werden');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Name ist erforderlich');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        max_temp: maxTemp ? parseInt(maxTemp) : null,
        description: description.trim(),
        active,
      };

      if (isEdit) {
        await api.put(`/kilns/${route.params.id}`, data);
      } else {
        await api.post('/kilns', data);
      }
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Fehler', error.message);
      } else {
        Alert.alert('Fehler', 'Ofen konnte nicht gespeichert werden');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input label="Name *" value={name} onChangeText={setName} placeholder="z.B. Großer Ofen" autoFocus />
      <Input label="Max. Temperatur (°C)" value={maxTemp} onChangeText={setMaxTemp} keyboardType="number-pad" placeholder="z.B. 1280" />
      <Input
        label="Beschreibung"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: 'top' }}
        placeholder="Details zum Ofen..."
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Ofen aktiv</Text>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ false: colors.border, true: colors.success + '60' }}
          thumbColor={active ? colors.success : '#f4f3f4'}
        />
      </View>

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
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  switchLabel: { fontSize: fontSize.md, color: colors.text },
  saveButton: { marginTop: spacing.lg },
});

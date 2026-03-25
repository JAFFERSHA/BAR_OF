import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [currency, setCurrency] = useState('$');
  const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isOwner = user?.role === 'OWNER';

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await api.getSettings();
      setCurrency(result.currency);
      setCurrencyOptions(result.currencyOptions);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleCurrencyChange(newCurrency: string) {
    if (!isOwner) { Alert.alert('Access Denied', 'Only owners can change settings.'); return; }
    setSaving(true);
    try {
      const result = await api.updateSettings(newCurrency);
      setCurrency(result.currency);
      Alert.alert('Saved', `Currency set to ${result.currency}`);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#3b82f6" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>App preferences</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Name</Text>
          <Text style={styles.infoValue}>{user?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Role</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role}</Text>
          </View>
        </View>
        {user?.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        )}
        {user?.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Phone</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>
        )}
      </View>

      {isOwner && (
        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>Currency</Text>
          <Text style={styles.sectionHint}>Choose how prices are displayed across the app.</Text>
          {saving && <ActivityIndicator color="#3b82f6" style={{ marginVertical: 8 }} />}
          <View style={styles.currencyGrid}>
            {currencyOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.currencyBtn, opt === currency && styles.currencyBtnActive]}
                onPress={() => handleCurrencyChange(opt)}
                disabled={saving}
              >
                <Text style={[styles.currencyBtnText, opt === currency && styles.currencyBtnTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.sectionLabel}>Session</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  panel: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#161616', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#2a2a2a'
  },
  sectionLabel: { fontSize: 12, color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  sectionHint: { fontSize: 13, color: '#666', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  infoKey: { color: '#888', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14 },
  roleBadge: { backgroundColor: '#3b82f622', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  currencyGrid: { flexDirection: 'row', gap: 10 },
  currencyBtn: { flex: 1, backgroundColor: '#222', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  currencyBtnActive: { backgroundColor: '#3b82f622', borderColor: '#3b82f6' },
  currencyBtnText: { color: '#888', fontSize: 20, fontWeight: '700' },
  currencyBtnTextActive: { color: '#3b82f6' },
  logoutBtn: { backgroundColor: '#ff9b9d22', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ff9b9d44' },
  logoutBtnText: { color: '#ff9b9d', fontWeight: '600', fontSize: 15 }
});

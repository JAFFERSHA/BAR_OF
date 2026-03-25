import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, DashboardData, LowStockItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardScreen() {
  const { signOut, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await api.getDashboard();
      setData(result);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  const fmt = (n: number) => `${data?.currency ?? '$'}${n.toFixed(2)}`;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#3b82f6" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {data?.userName ?? user?.name} 👋</Text>
          <Text style={styles.subtitle}>Quick glance at bar performance</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <StatCard title="Products" value={String(data?.productCount ?? 0)} sub="active SKUs" />
        <StatCard
          title="Low on Stock"
          value={String(data?.lowStockCount ?? 0)}
          sub="below reorder level"
          danger={(data?.lowStockCount ?? 0) > 0}
        />
        <StatCard title="Sales Today" value={fmt(data?.salesToday ?? 0)} sub="bills issued" />
        <StatCard title="Purchases Today" value={fmt(data?.purchasesToday ?? 0)} sub="stock intake" />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Low Stock Watchlist</Text>
        {(data?.lowStockItems ?? []).length === 0 ? (
          <Text style={styles.empty}>All good — no SKUs below reorder threshold.</Text>
        ) : (
          data?.lowStockItems.map((item: LowStockItem) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSku}>{item.sku}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{item.quantity}</Text>
              </View>
              <Text style={styles.rowReorder}>/ {item.reorderLevel}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, sub, danger = false }: { title: string; value: string; sub: string; danger?: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, danger && styles.dangerText]}>{value}</Text>
      <Text style={styles.cardSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, paddingTop: 60
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  logoutBtn: { backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#888', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  card: {
    backgroundColor: '#161616', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#2a2a2a',
    width: '47%'
  },
  cardTitle: { fontSize: 13, color: '#888', marginBottom: 8 },
  cardValue: { fontSize: 26, fontWeight: '700', color: '#fff' },
  cardSub: { fontSize: 11, color: '#666', marginTop: 2 },
  dangerText: { color: '#ff9b9d' },
  panel: { margin: 16, backgroundColor: '#161616', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  panelTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  empty: { color: '#666', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#222' },
  rowName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  rowSku: { color: '#666', fontSize: 12 },
  pill: { backgroundColor: '#ff9b9d33', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  pillText: { color: '#ff9b9d', fontWeight: '600', fontSize: 13 },
  rowReorder: { color: '#666', fontSize: 13, marginLeft: 6 }
});
